# Get list of chats

GET https://api.fanvue.com/chats

Returns a paginated list of chat conversations with optional filtering, searching, and sorting.

**Available Filters** (via `filter` parameter):

- `unread` - Only unread chats
- `online` - Only online users
- `subscribed_to` - Users you're subscribed to
- `not_muted` - Exclude muted chats
- `subscribers` - Only subscribers (creator-only)
- `followers` - Only followers (creator-only)
- `recent_subscribers` - Recently subscribed (creator-only)
- `not_answered` - Unanswered chats (creator-only)
- `spent_more_than_50` - High spenders (creator-only)
- `on_free_trial` - Free trial users (creator-only)
- `has_tipped` - Users who have tipped (creator-only)
- `spenders` - All spenders (creator-only)
- `exclude_creators` - Exclude creator accounts (creator-only)

**Sort Options** (via `sortBy` parameter):

- `most_recent_messages` (default) - Sort by most recent message
- `online_now` - Prioritize online users
- `most_unanswered_chats` - Sort by unanswered count

<Info>Scope required: `read:chat`</Info>

<Warning>Some filters are only available to creators. Using creator-only filters as a non-creator will return a 403 error.</Warning>

Reference: https://api.fanvue.com/docs/api-reference/reference/chats/list-chats

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get list of chats
  version: endpoint_.listChats
paths:
  /chats:
    get:
      operationId: list-chats
      summary: Get list of chats
      description: >-
        Returns a paginated list of chat conversations with optional filtering,
        searching, and sorting.


        **Available Filters** (via `filter` parameter):

        - `unread` - Only unread chats

        - `online` - Only online users

        - `subscribed_to` - Users you're subscribed to

        - `not_muted` - Exclude muted chats

        - `subscribers` - Only subscribers (creator-only)

        - `followers` - Only followers (creator-only)

        - `recent_subscribers` - Recently subscribed (creator-only)

        - `not_answered` - Unanswered chats (creator-only)

        - `spent_more_than_50` - High spenders (creator-only)

        - `on_free_trial` - Free trial users (creator-only)

        - `has_tipped` - Users who have tipped (creator-only)

        - `spenders` - All spenders (creator-only)

        - `exclude_creators` - Exclude creator accounts (creator-only)


        **Sort Options** (via `sortBy` parameter):

        - `most_recent_messages` (default) - Sort by most recent message

        - `online_now` - Prioritize online users

        - `most_unanswered_chats` - Sort by unanswered count


        <Info>Scope required: `read:chat`</Info>


        <Warning>Some filters are only available to creators. Using creator-only
        filters as a non-creator will return a 403 error.</Warning>
      tags:
        - []
      parameters:
        - name: page
          in: query
          description: Page number to retrieve (starts from 1)
          required: false
          schema:
            type: number
            format: double
            default: 1
        - name: size
          in: query
          description: 'Number of items to return per page (1-50, default: 15)'
          required: false
          schema:
            type: number
            format: double
            default: 15
        - name: customListId
          in: query
          description: Filter chats by custom list UUID
          required: false
          schema:
            type: string
            format: uuid
        - name: smartListIds
          in: query
          description: Filter chats by smart list type(s)
          required: false
          schema:
            type: array
            items:
              $ref: '#/components/schemas/ChatsGetParametersSmartListIdsSchemaItems'
        - name: filter
          in: query
          description: Filter types to apply (can specify multiple via repeated params)
          required: false
          schema:
            type: array
            items:
              $ref: '#/components/schemas/ChatsGetParametersFilterSchemaItems'
        - name: search
          in: query
          description: Search term to filter chats by user name/handle
          required: false
          schema:
            type: string
        - name: sortBy
          in: query
          description: 'Sort order for chat list (default: most_recent_messages)'
          required: false
          schema:
            $ref: '#/components/schemas/ChatsGetParametersSortBy'
        - name: Authorization
          in: header
          description: >-
            Bearer authentication of the form `Bearer <token>`, where token is
            your auth token.
          required: true
          schema:
            type: string
        - name: X-Fanvue-API-Version
          in: header
          description: API version to use for the request
          required: true
          schema:
            type: string
            default: '2025-06-26'
      responses:
        '200':
          description: List of chats
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/listChats_Response_200'
        '400':
          description: Bad Request - API version not supported OR validation failed
          content: {}
        '401':
          description: Unauthorized Response
          content: {}
        '403':
          description: Unauthorized Response
          content: {}
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    ChatsGetParametersSmartListIdsSchemaItems:
      type: string
      enum:
        - value: subscribers
        - value: auto_renewing
        - value: non_renewing
        - value: followers
        - value: free_trial_subscribers
        - value: expired_subscribers
        - value: spent_more_than_50
    ChatsGetParametersFilterSchemaItems:
      type: string
      enum:
        - value: unread
        - value: subscribers
        - value: followers
        - value: online
        - value: recent_subscribers
        - value: not_answered
        - value: spent_more_than_50
        - value: on_free_trial
        - value: has_tipped
        - value: spenders
        - value: exclude_creators
        - value: subscribed_to
        - value: not_muted
    ChatsGetParametersSortBy:
      type: string
      enum:
        - value: most_recent_messages
        - value: online_now
        - value: most_unanswered_chats
    ChatsGetResponsesContentApplicationJsonSchemaDataItemsUser:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        handle:
          type: string
        displayName:
          type: string
        nickname:
          type:
            - string
            - 'null'
        isTopSpender:
          type: boolean
        avatarUrl:
          type:
            - string
            - 'null'
        registeredAt:
          type: string
          format: date-time
      required:
        - uuid
        - handle
        - displayName
        - nickname
        - isTopSpender
        - avatarUrl
        - registeredAt
    ChatsGetResponsesContentApplicationJsonSchemaDataItemsLastMessageType:
      type: string
      enum:
        - value: AUTOMATED_CANCELED
        - value: AUTOMATED_NEW_FOLLOWER
        - value: AUTOMATED_NEW_PURCHASE
        - value: AUTOMATED_NEW_SUBSCRIBER
        - value: AUTOMATED_RE_SUBSCRIBED
        - value: AUTOMATED_RENEWED
        - value: AUTOMATED_FIRST_MESSAGE_REPLY
        - value: AUTOMATED_CHAT_MESSAGE_REPLY
        - value: BROADCAST
        - value: CHAT_TEXT_GENERATION
        - value: CHAT_TEXT_REWRITE
        - value: CHAT_TEXT_REPLY
        - value: GHOST_PROMOTION
        - value: MARKETING_KYC
        - value: TIP
        - value: LOCKED_MESSAGE_UNLOCKED
        - value: VOICE_CALL
        - value: SINGLE_RECIPIENT
    ChatsGetResponsesContentApplicationJsonSchemaDataItemsLastMessageMediaType:
      type: string
      enum:
        - value: image
        - value: video
        - value: audio
        - value: document
    ChatsGetResponsesContentApplicationJsonSchemaDataItemsLastMessage:
      type: object
      properties:
        text:
          type:
            - string
            - 'null'
        type:
          $ref: >-
            #/components/schemas/ChatsGetResponsesContentApplicationJsonSchemaDataItemsLastMessageType
        uuid:
          type: string
        sentAt:
          type: string
          format: date
        hasMedia:
          type:
            - boolean
            - 'null'
        mediaType:
          oneOf:
            - $ref: >-
                #/components/schemas/ChatsGetResponsesContentApplicationJsonSchemaDataItemsLastMessageMediaType
            - type: 'null'
        senderUuid:
          type: string
          format: uuid
      required:
        - text
        - type
        - uuid
        - sentAt
        - hasMedia
        - mediaType
        - senderUuid
    ChatsGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        createdAt:
          type: string
          format: date
        lastMessageAt:
          type:
            - string
            - 'null'
          format: date
          description: Date of the last message in this chat
        isRead:
          type: boolean
          description: Whether the chat is marked as read (true) or unread (false)
        isMuted:
          type: boolean
        unreadMessagesCount:
          type: number
          format: double
        user:
          $ref: >-
            #/components/schemas/ChatsGetResponsesContentApplicationJsonSchemaDataItemsUser
        lastMessage:
          oneOf:
            - $ref: >-
                #/components/schemas/ChatsGetResponsesContentApplicationJsonSchemaDataItemsLastMessage
            - type: 'null'
      required:
        - createdAt
        - lastMessageAt
        - isRead
        - isMuted
        - unreadMessagesCount
        - user
        - lastMessage
    ChatsGetResponsesContentApplicationJsonSchemaPagination:
      type: object
      properties:
        page:
          type: number
          format: double
          description: Current page number
        size:
          type: number
          format: double
          description: Number of records returned in this response
        hasMore:
          type: boolean
          description: Whether there are more items available on subsequent pages
      required:
        - page
        - size
        - hasMore
    listChats_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/ChatsGetResponsesContentApplicationJsonSchemaDataItems
          description: Array of chat conversations
        pagination:
          $ref: >-
            #/components/schemas/ChatsGetResponsesContentApplicationJsonSchemaPagination
          description: Pagination information
      required:
        - data
        - pagination
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/chats"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/chats'
const options = {
  method: 'GET',
  headers: { 'X-Fanvue-API-Version': '2025-06-26', Authorization: 'Bearer <token>' },
}

try {
  const response = await fetch(url, options)
  const data = await response.json()
  console.log(data)
} catch (error) {
  console.error(error)
}
```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.fanvue.com/chats"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("X-Fanvue-API-Version", "2025-06-26")
	req.Header.Add("Authorization", "Bearer <token>")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.fanvue.com/chats")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/chats")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/chats', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/chats");
var request = new RestRequest(Method.GET);
request.AddHeader("X-Fanvue-API-Version", "2025-06-26");
request.AddHeader("Authorization", "Bearer <token>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-Fanvue-API-Version": "2025-06-26",
  "Authorization": "Bearer <token>"
]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/chats")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```
