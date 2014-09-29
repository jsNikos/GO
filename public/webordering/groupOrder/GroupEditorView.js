define(['./GroupInviterView', 'css!./groupEditor'],
function(GroupInviterView){
	return function(args){
		GroupEditorView.prototype = new GroupInviterView(args);
		return new GroupEditorView(args);
	};
	
	function GroupEditorView(args){
		var scope = undefined;		
				
		/**
		 * @overriden
		 */
		this.init = function(){
			scope = this;
			Object.getPrototypeOf(this).init.call(this);
			preSelectInvitedFriend();
			preSelectNote();
			disableTimepicker();
		};				
		
		/**
		 * Preselects and disables note.
		 */
		function preSelectNote(){
			scope.$invitationNote
				.val(scope.controller.groupOrder.note)
				.attr('disabled', 'disabled');			
		}
		
		/**
		 * Preselects checkboxes for friend which are invited in given group-order and
		 * disables this checkboxes in order not be able to un-invated a friend.
		 */
		function preSelectInvitedFriend(){		
			jQuery('input[name="inviteCheck"]', scope.$getFriendsList()).each(function(){
				jQuery(this).removeAttr('checked');
			});
			
			_.chain(scope.controller.groupOrder.friends).each(function(friend){
				var $invitee = jQuery('.invitee[data-email="'+friend.email+'"]', scope.$getFriendsList());
				if($invitee.size() > 0){
					jQuery('input[name="inviteCheck"]', $invitee)
						.attr('checked', 'checked')
						.attr('disabled', 'disabled');
					$invitee.addClass('invited');
				}
			});			
		}	
		
		this.findDialogTitle = function(){
			return 'Add more friends to this group order';
		};
		
		/**
		 * @overriden
		 */
		this.findDataRole = function(){
			return 'edit';
		};
		
		/**
		 * @overriden
		 */
		this.canInvite = function($invitee){
			return !$invitee.hasClass('invited');
		}; 
		
		/**
		 * @overriden
		 */
		function disableTimepicker(){	
			scope.$expirationTime.timepicker('disable');
		};	
		
	}
	
});