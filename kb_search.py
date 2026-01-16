KB_INDEX = {
    "bank_approval_pending": {
        "domain": "bank",
        "articles": [
            {
                "title": "How to Complete a Bank Approval",
                "summary": "Steps to complete bank approval using a second user with banking permission.",
                "url": "https://graphite.zendesk.com/hc/en-us/articles/4410543162135-How-to-Complete-a-Bank-Approval"
            }
        ]
    },

    "bank_approval_pending_invitation_sent": {
        "domain": "bank",
        "articles": [
            {
                "title": "Accepting an invitation to complete bank approval",
                "summary": "Steps for supplier to accept the invitation and complete the bank approval task.",
                "url": "https://graphite.zendesk.com/hc/en-us/articles/4410543162135-How-to-Complete-a-Bank-Approval"
            }
        ]
    },

    "bank_approval_no_second_user": {
        "domain": "bank",
        "articles": [
            {
                "title": "How to add a second user",
                "summary": "Steps to add an additional user to a supplier profile.",
                "url": "https://graphite.zendesk.com/hc/en-us/articles/4406974262807-Adding-new-users"
            },
            {
                "title": "Bank approval roles and permissions",
                "summary": "Explanation of required permissions for bank approval.",
                "url": "https://graphite.zendesk.com/hc/en-us/articles/4409216220951-Roles-Permissions"
            },
            {
                "title": "How to complete a bank approval task",
                "summary": "Steps for the approver to complete the bank approval task",
                "url": "https://graphite.zendesk.com/hc/en-us/articles/4410543162135-How-to-Complete-a-Bank-Approval"
            }
        ]
    }
}

def search_kb(case_key=None, text=None):
    if case_key and case_key in KB_INDEX:
        return KB_INDEX[case_key]

    return None
