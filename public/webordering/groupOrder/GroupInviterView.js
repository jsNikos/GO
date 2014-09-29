define(['text!./friendsEditor.html',
        'text!./invitee.html',
        'text!./friendInput.html',
        'moment',
        'css!./groupOrder',
        'commons/libs/jquery.scrollTo',
        'commons/libs/timepicker/jquery.ui.timepicker',
        'css!commons/libs/timepicker/jquery.ui.timepicker'],
function(friendsEditorHtml, inviteeHtml, friendInputHtml, moment){
	return GroupInviterView;
	
	function GroupInviterView(args){
		var scope = undefined;
		this.controller = args.controller;
		
		// el's 
		var $el = args.$el; 	// the views root dom-context
		var $friendsList = jQuery('.friends-list', $el);
		var $inviteeCreator = undefined;		
		var $inviteFriendValMsg = undefined; // validation-msg for invite
		var $addFriend = undefined; // addFriend-button	
		var $friendsList = undefined; // list holding invitees
		var $dialog = undefined; // the dialog
		var $inviteButton = undefined;		
		this.$expirationTime = undefined; // expiration-timepicker
		this.$invitationNote = undefined;		
		
		// templates
		var inviteeTmpl = _.template(inviteeHtml);
		var friendInputTmpl = _.template(friendInputHtml);
				
		this.init = function(){
			scope = this;
			initDialog();
			initFriendsList();
			initChangeAllSelect();
			initInviteeCreator();
			initTimepicker();
			scope.addFriendInput();
		};		
		
		/**
		 * Initializes the pop-up and el's.
		 */
		function initDialog(){
			$el.attr('data-role', scope.findDataRole());
			$el.empty().append(friendsEditorHtml);			
			$inviteeCreator = jQuery('.invitee.creator', $el);
			$inviteFriendValMsg = jQuery('.validation-msg.invite', $el);
			$friendsList = jQuery('.friends-list', $el);
			scope.$invitationNote = jQuery('[name="InvitationNote"]', $el);
			
			$el.dialog({	
				width: '',
				title: LocaleString.get(scope.findDialogTitle()),
				modal: true,
				resizable: false,
				draggable: false,
				dialogClass: 'responsive',
				buttons: [{
					text: 'Cancel',
					click: function() {	$el.dialog('close'); }
				},{
					text: 'Invite',
					'class': 'invite',
					click: function(){ scope.controller.handleInvite(); }												
				}]
			});				
			$dialog = $el.closest('.ui-dialog');	
			$dialog.css({width: '', left: '', right:'', top:''});
			$inviteButton = jQuery('button.invite', $dialog);
		}
		
		this.findDialogTitle = function(){
			return 'Invite your friends for a group order';
		};
		
		/**
		 * The role/mode for this dialog.
		 */
		this.findDataRole = function(){
			return 'create';
		};
		
		/**
		 * Initialized timepicker
		 */
		function initTimepicker(){			
			scope.$expirationTime = jQuery('.expiration-time input', $el)
								.timepicker({showPeriod: true, beforeShow: beforeShow})
								.timepicker('setTime', scope.controller.findExpirationTimeInit());
			
			function beforeShow(){
				scope.$expirationTime.data('onShowTime', moment().valueOf());				
			}
		}
		
		/**
		 * Registers click listener which triggers to select/unselect all friends for invitation.
		 */
		function initChangeAllSelect(){
			jQuery('.changeAllSelect', $el)
				.on('click', '.select', selectAll)
				.on('click', '.unselect', unselectAll);
			
			function selectAll(){
				jQuery('[name="inviteCheck"]', $friendsList).each(function(){
					var $checkbox = jQuery(this);
					if(scope.canInvite($checkbox.closest('.invitee'))){
						$checkbox.attr('checked', 'checked');
					}				
				});				
			}
			
			function unselectAll(){
				jQuery('[name="inviteCheck"]', $friendsList).each(function(){
					var $checkbox = jQuery(this);
					if(scope.canInvite($checkbox.closest('.invitee'))){
						$checkbox.removeAttr('checked');
					}
				});				
			}
		}
		
		/**
		 * Checks if the friends belonging to given $invitee can be invited.
		 */
		this.canInvite = function($invitee){
			return true;
		}; 
		
		/**
		 * Adds a new friendInput to the friend-input's container.
		 */
		this.addFriendInput = function(){
			$inviteeCreator.append(friendInputTmpl())
						   .scrollTo('100%');
		};
		
		/**
		 * Grasps all saved friends which are flagged to be invited, the note and the expiration-date.
		 *  
		 * @returns groupOrder  
		 */
		this.graspGroupOrder = function(){ 
			var $invitedFriends = jQuery('.invitee:has(:checked)', $friendsList);
			// add selected saved friends
			var invitedFriends = _.chain($invitedFriends.toArray())
			 					  .map(function(friend){ return jQuery(friend).data('friend'); })
			 					  .value();			
			return {
				note : scope.$invitationNote.val(),  
				expirationHour: scope.$expirationTime.timepicker('getHour'),
				expirationMin: scope.$expirationTime.timepicker('getMinute'),
				expirationShowTime: scope.$expirationTime.data('onShowTime'),
				friends : invitedFriends
			};				
		};	
		
		/**
		 * Grasps all new friends (only those which have either email or name set).
		 * @return [FriendValWrapper] : [{friend: GroupOrderFriendHolder, $inputLine: jQuery-ref}]
		 */
		this.graspNewFriends = function(){
			var newFriends = [];
			// add all new friends
			jQuery('.input-line', $inviteeCreator).each(function(){
				var $inputLine = jQuery(this);
				var friend = scope.controller.createFriend(scope.serializeInputLine($inputLine));
				(friend.email || friend.name) && newFriends.push({friend: friend, $inputLine: $inputLine});
			});	
			return newFriends;
		};
		
		
		
		/**
		 * Serializes inputs from given input-line.
		 * [{name, value}]
		 */
		this.serializeInputLine = function($inputLine){
			return jQuery('input', $inputLine).serializeArray();
		};
		
		/**
		 * Show dialog in loading-state.
		 */
		this.showLoadingState = function(){
			$el.addClass('loading');			
		};
		
		this.removeLoadingState = function(){
			$el.removeClass('loading');			
		};
		
		/**
		 * Show given validation msg on inviting validations.		 
		 */
		this.showInviteFriendsValError = function(msg){
			$inviteFriendValMsg.text(msg).addClass('req'); 			
		};
		
		this.removeInviteFriendsValError = function(){
			$inviteFriendValMsg.empty().removeClass('req');
		};
		
		/**
		 * Shows given validation msg for adding friends.
		 * @param msg
		 * @param $inputLine : the validation target
		 */
		this.showFriendValError = function($inputLine, msg){
			jQuery('.validation-msg', $inputLine).text(msg).addClass('req');			
		};
		
		/**
		 * Scroll in invitee-creator to given input-line.
		 */
		this.scrollToInputLine = function($inputLine){
			$inviteeCreator.scrollTo($inputLine);
		};
		
		/**
		 * Cleans-up validation msg concerning add-friends.
		 */
		function removeFriendValError(){			
			jQuery('.validation-msg', $inviteeCreator).empty().removeClass('req'); 
		}		
		
		/**
		 * Removes all validation errors.
		 */
		this.removeValErrors = function(){
			removeFriendValError();
			scope.removeInviteFriendsValError();
		};
		
		/**
		 * Renders validation-errors contained in given errorHolder.
		 * It is required here that email-inputs are unique and not-empty.
		 * @param ErrorHolder
		 */
		this.renderValidationErrors = function(errorHolder){
			errorHolder.validationErrors.length > 0 && scope.showInviteFriendsValError(errorHolder.validationErrors.join(' '));			
			_.each(errorHolder.friendErrorHolders, function(friendError){
				var $inputLine = jQuery('input[name="email"]', $inviteeCreator)
										.filter(function(){ return jQuery(this).val() === friendError.email; })
										.first()
										.closest('.input-line');
				scope.showFriendValError($inputLine, friendError.validationErrors.join(' '));
			});			
		};
		
		/**
		 * Registers a delegating click -listener on iniviteeCreator for  add-button, and focus-out
		 * for inputs. 
		 */
		function initInviteeCreator(){ 
			$inviteeCreator.on('click', '.add', scope.controller.handleAddClicked);
		}
		
		/**
		 * Disables add-friend button.
		 */
		this.disableAddFriend = function(){
			$addFriend.addClass('disabled'); 
		};			
		
		/**
		 * Disables invite-button
		 */
		this.disableInvite = function(){
			$inviteButton.button('disable');
		};
		
		/**
		 * Enables invite-button
		 */
		this.enableInvite = function(){
			$inviteButton.button('enable');
		};		
		
		/**
		 * Renders friends.
		 * Registers delegating click listener on remove-icon of a list-item.
		 */
		function initFriendsList(){
			_.chain(scope.controller.friends)
				.sortBy(function(friend){return friend.name;})
				.each(scope.addToFriends);			 
			
			$friendsList
			.on('click', '.remove', function(event){
				scope.controller.handleRemoveFriend(jQuery(event.target).closest('.invitee'));				
			})
			.on('change', 'input[name="inviteCheck"]', scope.removeInviteFriendsValError);
		}
		
		/**
		 * Adds the given friend to the list.
		 * @param friend : GroupOrderFriend
		 */
		this.addToFriends = function(friend){
			jQuery(inviteeTmpl(friend))
				.data('friend', friend)
				.appendTo($friendsList);			
		};	
		
		this.$getFriendsList = function(){
			return $friendsList;
		};
		
		this.$getEl = function(){
			return $el;
		};
		
	}
	
});