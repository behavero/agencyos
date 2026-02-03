# Get unread chats, messages, and notifications count

GET https://api.fanvue.com/chats/unread

Returns the count of unread chats, total unread messages, and unread notifications by type for the authenticated user.

<Info>Scope required: `read:chat`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/chats/get-unread-chats-count

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get unread chats, messages, and notifications count
  version: endpoint_.getUnreadChatsCount
paths:
  /chats/unread:
    get:
      operationId: get-unread-chats-count
      summary: Get unread chats, messages, and notifications count
      description: >-
        Returns the count of unread chats, total unread messages, and unread
        notifications by type for the authenticated user.


        <Info>Scope required: `read:chat`</Info>
      tags:
        - []
      parameters:
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
          description: Unread counts retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getUnreadChatsCount_Response_200'
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
    ChatsUnreadGetResponsesContentApplicationJsonSchemaUnreadNotifications:
      type: object
      properties:
        newFollower:
          type: number
          format: double
          description: Number of unread new follower notifications
        newPostComment:
          type: number
          format: double
          description: Number of unread post comment notifications
        newPostLike:
          type: number
          format: double
          description: Number of unread post like notifications
        newPurchase:
          type: number
          format: double
          description: Number of unread purchase notifications
        newSubscriber:
          type: number
          format: double
          description: Number of unread new subscriber notifications
        newTip:
          type: number
          format: double
          description: Number of unread tip notifications
        newPromotion:
          type: number
          format: double
          description: Number of unread promotion notifications
      required:
        - newFollower
        - newPostComment
        - newPostLike
        - newPurchase
        - newSubscriber
        - newTip
        - newPromotion
    getUnreadChatsCount_Response_200:
      type: object
      properties:
        unreadChatsCount:
          type: number
          format: double
          description: Number of conversations with unread messages
        unreadMessagesCount:
          type: number
          format: double
          description: Total number of unread messages across all chats
        unreadNotifications:
          $ref: >-
            #/components/schemas/ChatsUnreadGetResponsesContentApplicationJsonSchemaUnreadNotifications
          description: Counts of unread notifications by type
      required:
        - unreadChatsCount
        - unreadMessagesCount
        - unreadNotifications
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/chats/unread"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/chats/unread'
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

	url := "https://api.fanvue.com/chats/unread"

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

url = URI("https://api.fanvue.com/chats/unread")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/chats/unread")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/chats/unread', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/chats/unread");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/chats/unread")! as URL,
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
