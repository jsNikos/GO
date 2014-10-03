define([ './GroupInviterView',
         'commons/libs/EventEmitter',         
         'commons/libs/url-template',
         'moment',
         'commons/libs/underscore-ext'],
function(GroupInviterView, EventEmitter, urlTemplate, moment) {
	return function(args){
		GroupInviterController.prototype = new EventEmitter();
		return new GroupInviterController(args);
	};

	/**
	 * @param args : {onError : function(),
	 * 					$el : jQuery-ref to dom-context}
	 */
	function GroupInviterController(args) {
		var scope = undefined;
		this.view = undefined;		
		this.CONTROLLER_URL = '/ws/webordering/grouporder';
		
		// events
		this.error = 'ERROR';	
		this.emailVerifRequired = 'EMAIL_VERIF_REQUIRED';
		
		// model
		this.friends = undefined;
		this.MAX_FRIENDS = 50;
		this.loginEmail = jQuery.cookie('COOKIE_LOGIN_EMAIL');
		
		/**
		 * @param callback : function(err, result), ready-callback
		 */
		this.init = function(callback){
			scope = this;
			args.onError && scope.on(scope.error, args.onError);
			requestFindFriends(function(err, resp){	
				if(err){
					checkHandleAsNotVerifiedEmailError(err);
					return;
				}
				onModelReceived(err, resp);				
				callback(err, null); // ready with init
			});	
		};		
		
		this.show = function(){
			scope.view = new GroupInviterView({
				$el : args.$el,
				controller : scope
			});
			scope.view.init();
		};
		
		/**
		 * Updates the model and intializes view.
		 * @param err : in case of error
		 * @param resp : {response : [GroupOrderFriend]}
		 */
		function onModelReceived(err, resp){				
			scope.friends = resp.response;				
		}		
		
		/**
		 * Handles click on add-icon by triggering to add a new input-line.
		 */
		this.handleAddClicked = function(event){
			validate(findAllInvitees()) && scope.view.addFriendInput();			
		};			
		
		
		/**
		 * Creates a friend-instance from given args.
		 * @param args : [{name: 'name', value: string},{name: 'email', value: string}]
		 */
		this.createFriend = function(args){
			return{
				name: _.findWhere(args, {name: 'name'}).value,
				email: _.findWhere(args, {name: 'email'}).value,
				groupName: 'default'
			};			
		};
		
		/**
		 * Checks the given error to be authorization-error due to not-verfied-email of user,
		 * in case invokes triggers to display pop-up containing verification-link, otherwise fire 'this.error'.		  
		 * @param err - ajax-error
		 * @param renderer - function(msg)
		 */
		function checkHandleAsNotVerifiedEmailError(err){			
			var errResp = err && err.responseText && JSON.parse(err.responseText);			
			var event = isErrorOfType(errResp, 'NotVerifiedEmailException') ? scope.emailVerifRequired : scope.error;				
			scope.fire(event, errResp);			
		}		
		
		/**
		 * Checks the given error-response (parsed err.responseText) to be of given type.
		 * From the error the meta.info is taken into consideration.
		 * @param errResp
		 * @param type
		 * @returns {Boolean}
		 */
		function isErrorOfType(errResp, type){
			if(errResp && errResp.meta && errResp.meta.info === type){
				return true;
			}
			return false;
		}		
		
		/**
		 * Handles remove-click by triggering to remove from list, updating the model
		 * and synchronizing with server.
		 * @param $invitee : jQuery-ref to invitee to remove 
		 */
		this.handleRemoveFriend = function($invitee){		
			var friend = $invitee.data('friend');			
			requestRemoveFriend(friend, function(err){
				if(err){
					scope.fire(scope.error, JSON.parse(err.responseText));
					return;
				}
				_ext.removeWhere(scope.friends, _.pick(friend, ['email', 'groupName']));
				$invitee.remove();
			});
		};
		
		/**
		 * Triggers to invite given list of friends to a groupOrder.
		 * Before, request to validate all new friends.		  
		  * @param groupOrder : {friends : [GroupOrderFriend], note: string}
		 */
		this.handleInvite = function(){			
			scope.view.disableInvite();				

			// get groupOrder and join new friends
			var allInvitees = findAllInvitees();						
			
			// ensure minimum validations
			if(!validate(allInvitees)){
				scope.view.enableInvite();
				return;
			}
			scope.view.showLoadingState();
			scope.requestInviteFriends(allInvitees.groupOrder, function(err, result){
				if(err){					
					var errResp = err && err.responseText && JSON.parse(err.responseText);
					scope.fire(scope.error, errResp);
					return;					
				}
				if(!existsValidationErrors(result)){
					window.location = '/';					
				}else{
					scope.view.renderValidationErrors(result.response);
					scope.view.enableInvite();
					scope.view.removeLoadingState();
				}													
			});	
			
			function existsValidationErrors(result){					
				return result.meta.code === 1003;			
			}
		};		
		
		/**
		 * @returns {groupOrder : GroupOrder (containing all new and saved invited),
		 *  		newFriendValWrappers : [FriendValWrapper], containing new friends }
		 */
		function findAllInvitees(){
			var groupOrder = scope.view.graspGroupOrder();
			groupOrder.expirationDate = createExpirationDate(groupOrder.expirationHour, groupOrder.expirationMin, groupOrder.expirationShowTime);
			var newFriendValWrappers = scope.view.graspNewFriends();
			groupOrder.friends = _.chain(groupOrder.friends)
								  .union(_.pluck(newFriendValWrappers, 'friend'))
								  .value();	
			return {
				groupOrder: groupOrder,
				newFriendValWrappers: newFriendValWrappers
			};
		}
		
		/**
		 * The initial time to show for the expiration-time-picker.
		 * @return Date
		 */
		this.findExpirationTimeInit = function(){
			return moment().add(30, 'minutes').toDate();
		};
		
		/**
		 * From given selected hour/minute creates a time (long) which serves as expiration-date
		 * for the group-order.
		 * In case of expirationHour are smaller than current hour, interpretes to be for next day.
		 * @param expirationHour : integer
		 * @param expirationMin : integer
		 * @param refTime: the ref-time for the given hours and minutes, usually when the timepicker opened
		 */
		function createExpirationDate(expirationHour, expirationMin, refTime){
			var result = moment(refTime).hour(expirationHour).minute(expirationMin);			
			if(result.isBefore(moment(refTime))){
				result.add(1, 'days');
			}
			return result.valueOf();			
		}		
		
		/**
		 * Provides minimum validation to ensure the front-end to work.
		 * All other valations are made server-side.
		 * Triggers to renders discovered errors on view.
		 * @param allInvitees : {groupOrder : GroupOrder,  newFriendValWrappers : [FriendValWrapper]} 
		 * @returns boolean : true if everything is ok
		 */
		function validate(allInvitees){			
			var result = true;
			scope.view.removeValErrors();		
			// calc. counts grouped-by email
			var emailCount = _.chain(allInvitees.groupOrder.friends).countBy(function(friend){return friend.email;}).value();
			// ensure not to surpass number of friends (new + saved)
			if((scope.friends.length + allInvitees.newFriendValWrappers.length) > scope.MAX_FRIENDS){
				scope.view.showInviteFriendsValError('You cannot have more than '+scope.MAX_FRIENDS+' friends.');
				result = false;
			}
			
			// ensure unique email
			var withIssue =	_.filter(allInvitees.newFriendValWrappers, function(friendValWrapper){	
				var hasIssue = false;
				if(!friendValWrapper.friend.email.trim()){
					scope.view.showFriendValError(friendValWrapper.$inputLine, 'Please provide an email.');					
					hasIssue = true;
				} else if(emailCount[friendValWrapper.friend.email] > 1){
					scope.view.showFriendValError(friendValWrapper.$inputLine, 'This email is used twice.');
					hasIssue = true;
				} else if(sameEmail(scope.loginEmail, friendValWrapper.friend.email)){
					scope.view.showFriendValError(friendValWrapper.$inputLine, 'You cannot invite yourself.');
					hasIssue = true;
				}
				return hasIssue;
			});		
			if(withIssue.length > 0){
				result = false;
				scope.view.scrollToInputLine(withIssue[0].$inputLine);
			} 			
			return result;			
		}
		
		/**
		 * Checks to emails to be identical.
		 */
		function sameEmail(email, other){
			return email && other && email.trim().toLowerCase() === other.trim().toLowerCase();
		}
		
		/**
		 * Pre-handles error by filtering-out aborted requests.
		 * @param jqXHR
		 * @param textStatus
		 * @param errorThrown
		 * @param callback
		 */
		this.preHandleError = function(callback, jqXHR, textStatus, errorThrown){
			if(textStatus === 'abort'){
				return;
			}
			callback = callback || function(){};
			callback(jqXHR);
		};
		
		/**
		 * Requests to create group-order and to invite given friends.
		 * The result contains the validated instance of groupOrder if validation issues
		 * were detected.
		 * @param groupOrder : {friends : [friend], note: string, expirationDate: long}
		 * @param callback : function(err, {response: GroupOrder})
		 */
		this.requestInviteFriends = function(groupOrder, callback){
			callback = callback || function(){}; 
			jQuery.ajax({
				url: scope.CONTROLLER_URL+'/invitations',								  
				type: 'PUT',
				contentType : 'application/json',
				global : false,
				data: JSON.stringify(groupOrder),					   
				success: callback.bind(this, null),
				error : scope.preHandleError.bind(this, callback)
			});
		};
		
		/**
		 * Fetches all available friends from server.
		 * @param callback : function(err, {response:[GroupOrderFriend]})
		 */
		function requestFindFriends(callback){
			jQuery.ajax({
				url: scope.CONTROLLER_URL+'/friends',								  
				type: 'GET',		
				global: false,
				dataType: 'json',
				success: callback.bind(this, null),
				error : scope.preHandleError.bind(this, callback)
			});
		}
		
		
		
		/**
		 * Requests server to remove friend by given email.
		 * @param friend : GroupOrderFriend
		 * @param callback : function(err)
		 */
		function requestRemoveFriend(friend, callback){
			callback = callback || function(){};				
			jQuery.ajax({  
				url: scope.CONTROLLER_URL + urlTemplate.parse('/friends/{email}/').expand(friend),								  
				type: 'DELETE',
				global : false,
				success: function(){
					callback();
				},
				error: scope.preHandleError.bind(this, callback)
			});
		}	

		
	}
});