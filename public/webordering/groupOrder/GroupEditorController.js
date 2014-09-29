define([ './GroupInviterController',
         './GroupEditorView',        
         'commons/libs/url-template',
         'commons/libs/async'],
function(GroupInviterController, GroupEditorView, urlTemplate, async) {
	return function(args){
		GroupEditorController.prototype = new GroupInviterController(args);
		return new GroupEditorController(args);
	};

	/**
	 * @param args : {onError : function(),
	 * 					$el : jQuery-ref to dom-context}
	 */
	function GroupEditorController(args) {
		var scope = undefined;

		// model
		this.groupOrder = undefined; // GroupOrderHolder
				
		/**
		 * @overriden
		 * @param callback : function(err, result), ready-callback
		 */
		this.init = function(callback) {
			scope = this;
			callback = callback || function(){};
			async.series([Object.getPrototypeOf(this).init.bind(this), requestGroupOrder], callback);		
		};		
		
		/**
		 * @overriden
		 */
		this.show = function(){
			scope.view = new GroupEditorView({
				$el : args.$el,
				controller : scope
			});
			scope.view.init();
		};		
		
		/**
		 * @override
		 */
		this.findExpirationTimeInit = function(){
			return  moment(scope.groupOrder.expirationDate).toDate();
		};		
		
		/**
		 * @overridenn
		 * Requests to add given friends to active group-order.
		 * @param groupOrder : {friends : [friend], note: string, expirationDate: long}
		 * @param callback : function(err, {response: GroupOrder})
		 */
		this.requestInviteFriends = function(groupOrder, callback){
			callback = callback || function(){}; 
			jQuery.ajax({
				url: scope.CONTROLLER_URL+'/friends',								  
				type: 'PUT',
				contentType : 'application/json',
				global : false,
				data: JSON.stringify(groupOrder),					   
				success: callback.bind(this, null),
				error : scope.preHandleError.bind(this, callback)
			});
		};
		
		/**
		 * Fetches current active group-order.
		 * @param callback : function(err, {response: {GroupOrderHolder}})
		 */
		function requestGroupOrder(callback){
			jQuery.ajax({
				url: scope.CONTROLLER_URL+'/',								  
				type: 'GET',		
				global: false,
				dataType: 'json',
				success: onSuccess,
				error : scope.preHandleError.bind(this, callback)
			});
			
			function onSuccess(resp){
				scope.groupOrder = resp.response;
				callback(null, resp);
			}
		}		

	}
});