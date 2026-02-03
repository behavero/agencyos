# Fanvue API Documentation

Complete API reference for Fanvue integration.

## Structure

Each endpoint has its own markdown file with:

- Endpoint URL and method
- Required scopes
- Request parameters
- Response schema
- SDK code examples

## Categories

### Users

- [Get current user](./users/get-current-user.md)

### Chats

- [Get list of chats](./chats/get-list-of-chats.md)
- [Get unread counts](./chats/get-unread-counts.md)
- [Get media from a chat](./chats/get-media-from-chat.md)
- [Create a new chat](./chats/create-new-chat.md)
- [Get online statuses](./chats/get-online-statuses.md)
- [Update chat properties](./chats/update-chat-properties.md)

### Chat Messages

- [Get messages from a chat](./chat-messages/get-messages-from-chat.md)
- [Send a message](./chat-messages/send-message.md)
- [Send a mass message](./chat-messages/send-mass-message.md)
- [Delete a message](./chat-messages/delete-message.md)

### Chat Templates

- [Get list of template messages](./chat-templates/get-list-of-templates.md)
- [Get a single template message](./chat-templates/get-single-template.md)

### Chat Smart Lists

- [Get smart lists](./chat-smart-lists/get-smart-lists.md)
- [Get smart list members](./chat-smart-lists/get-smart-list-members.md)

### Chat Custom Lists

- [Get custom lists](./chat-custom-lists/get-custom-lists.md)
- [Get custom list members](./chat-custom-lists/get-custom-list-members.md)
- [Create a custom list](./chat-custom-lists/create-custom-list.md)
- [Rename a custom list](./chat-custom-lists/rename-custom-list.md)
- [Delete a custom list](./chat-custom-lists/delete-custom-list.md)

### Chat Custom List Members

- [Add members to a custom list](./chat-custom-list-members/add-members.md)
- [Remove a member from a custom list](./chat-custom-list-members/remove-member.md)

### Posts

- [Get list of posts](./posts/get-list-of-posts.md)
- [Get post by UUID](./posts/get-post-by-uuid.md)
- [Get tips for a post](./posts/get-tips-for-post.md)
- [Get likes for a post](./posts/get-likes-for-post.md)
- [Get comments for a post](./posts/get-comments-for-post.md)
- [Create a new post](./posts/create-new-post.md)

### Creators

- [Get followers](./creators/get-followers.md)
- [Get subscribers](./creators/get-subscribers.md)

### Insights

- [Get earnings data](./insights/get-earnings-data.md)
- [Get top-spending fans](./insights/get-top-spending-fans.md)
- [Get subscribers count](./insights/get-subscribers-count.md)
- [Get fan insights](./insights/get-fan-insights.md)

### Media

- [Get user's media list](./media/get-users-media-list.md)
- [Get media by UUID](./media/get-media-by-uuid.md)
- [Create multipart upload session](./media/create-upload-session.md)
- [Get signed URL for upload part](./media/get-upload-part-url.md)
- [Complete upload session](./media/complete-upload-session.md)

### Tracking Links

- [List tracking links](./tracking-links/list-tracking-links.md)
- [Create a tracking link](./tracking-links/create-tracking-link.md)
- [Delete a tracking link](./tracking-links/delete-tracking-link.md)

### Vault

- [List vault folders](./vault/list-vault-folders.md)
- [Create a vault folder](./vault/create-vault-folder.md)
- [Get vault folder details](./vault/get-vault-folder-details.md)
- [Delete vault folder](./vault/delete-vault-folder.md)
- [Rename vault folder](./vault/rename-vault-folder.md)
- [List media in folder](./vault/list-media-in-folder.md)
- [Add media to folder](./vault/add-media-to-folder.md)
- [Remove media from folder](./vault/remove-media-from-folder.md)

### Agencies

- [Get agency creators](./agencies/get-agency-creators.md)
- [Get creator followers](./agencies/get-creator-followers.md)
- [Get creator subscribers](./agencies/get-creator-subscribers.md)
- [Get chats of a creator](./agencies/get-chats-of-creator.md)
- [Create new chat as creator](./agencies/create-chat-as-creator.md)
- [Get creator's smart lists](./agencies/get-creator-smart-lists.md)
- [Get creator's smart list members](./agencies/get-creator-smart-list-members.md)
- [Get creator's custom lists](./agencies/get-creator-custom-lists.md)
- [Get creator's custom list members](./agencies/get-creator-custom-list-members.md)
- [Send a mass message as creator](./agencies/send-mass-message-as-creator.md)
- [Send a message as creator](./agencies/send-message-as-creator.md)
- [Get messages between a creator and a user](./agencies/get-messages-between-creator-and-user.md)
- [Get media from a creator's chat](./agencies/get-media-from-creator-chat.md)
- [Get earnings data for a creator](./agencies/get-creator-earnings.md)
- [Get top-spending fans for a creator](./agencies/get-creator-top-spenders.md)
- [Get subscribers count for a creator](./agencies/get-creator-subscribers-count.md)
- [Get creator's media list](./agencies/get-creator-media-list.md)
- [Get creator's media by UUID](./agencies/get-creator-media-by-uuid.md)
- [Create multipart upload session for creator](./agencies/create-creator-upload-session.md)
- [Get signed URL for upload part](./agencies/get-creator-upload-part-url.md)
- [Complete creator's upload session](./agencies/complete-creator-upload-session.md)
- [Create a new post for a creator](./agencies/create-post-for-creator.md)
- [List creator's tracking links](./agencies/list-creator-tracking-links.md)
- [Create a tracking link for a creator](./agencies/create-creator-tracking-link.md)
- [Delete a tracking link for a creator](./agencies/delete-creator-tracking-link.md)

## Usage

Paste the OpenAPI specification and SDK examples from Fanvue's documentation into each file.
