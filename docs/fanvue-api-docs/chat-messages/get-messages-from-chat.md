# Get messages from a chat

GET https://api.fanvue.com/chats/{userUuid}/messages

Returns a paginated list of text messages between the authenticated user and the specified user. Messages are ordered by creation date (newest first).

    <Info>Scope required: `read:chat`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/chat-messages/list-messages

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get messages from a chat
  version: endpoint_.listMessages
paths:
  /chats/{userUuid}/messages:
    get:
      operationId: list-messages
      summary: Get messages from a chat
      description: >-
        Returns a paginated list of text messages between the authenticated user
        and the specified user. Messages are ordered by creation date (newest
        first).

            <Info>Scope required: `read:chat`</Info>
      tags:
        - []
      parameters:
        - name: userUuid
          in: path
          required: true
          schema:
            type: string
            format: uuid
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
          description: List of messages
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/listMessages_Response_200'
        '400':
          description: >-
            Bad Request - API version not supported OR validation failed OR
            invalid UUID
          content: {}
        '401':
          description: Unauthorized Response
          content: {}
        '403':
          description: Unauthorized Response
          content: {}
        '404':
          description: No conversation found with the given user
          content: {}
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsSender:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        handle:
          type: string
      required:
        - uuid
        - handle
    ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsRecipient:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        handle:
          type: string
    ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsMediaType:
      type: string
      enum:
        - value: image
        - value: video
        - value: audio
        - value: document
    ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsType:
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
    ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsPricingUsd:
      type: object
      properties:
        price:
          type: number
          format: double
          description: Price in cents
      required:
        - price
    ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsPricing:
      type: object
      properties:
        USD:
          $ref: >-
            #/components/schemas/ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsPricingUsd
      required:
        - USD
    ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
        text:
          type:
            - string
            - 'null'
        sentAt:
          type:
            - string
            - 'null'
          format: date
        sender:
          $ref: >-
            #/components/schemas/ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsSender
        recipient:
          $ref: >-
            #/components/schemas/ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsRecipient
        hasMedia:
          type:
            - boolean
            - 'null'
        mediaType:
          oneOf:
            - $ref: >-
                #/components/schemas/ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsMediaType
            - type: 'null'
        type:
          $ref: >-
            #/components/schemas/ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsType
        pricing:
          oneOf:
            - $ref: >-
                #/components/schemas/ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItemsPricing
            - type: 'null'
          description: Pricing information for pay-to-view messages
        purchasedAt:
          type:
            - string
            - 'null'
          format: date
          description: Timestamp when this message was purchased, or null if not purchased
      required:
        - uuid
        - text
        - sentAt
        - sender
        - recipient
        - hasMedia
        - mediaType
        - type
        - pricing
        - purchasedAt
    ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaPagination:
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
    listMessages_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaDataItems
          description: Array of messages in the conversation
        pagination:
          $ref: >-
            #/components/schemas/ChatsUserUuidMessagesGetResponsesContentApplicationJsonSchemaPagination
          description: Pagination information
      required:
        - data
        - pagination
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/chats/userUuid/messages"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/chats/userUuid/messages'
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

	url := "https://api.fanvue.com/chats/userUuid/messages"

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

url = URI("https://api.fanvue.com/chats/userUuid/messages")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/chats/userUuid/messages")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/chats/userUuid/messages', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/chats/userUuid/messages");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/chats/userUuid/messages")! as URL,
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
