# Delete a message

DELETE https://api.fanvue.com/chats/{userUuid}/messages/{messageUuid}

Delete/unsend a previously sent message from a chat conversation.

Only the sender can delete their own messages. Messages that have been purchased (paid content) cannot be deleted. Mass messages cannot be deleted via this endpoint.

<Info>Scope required: `write:chat`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/chat-messages/delete-message

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Delete a message
  version: endpoint_.deleteMessage
paths:
  /chats/{userUuid}/messages/{messageUuid}:
    delete:
      operationId: delete-message
      summary: Delete a message
      description: >-
        Delete/unsend a previously sent message from a chat conversation.


        Only the sender can delete their own messages. Messages that have been
        purchased (paid content) cannot be deleted. Mass messages cannot be
        deleted via this endpoint.


        <Info>Scope required: `write:chat`</Info>
      tags:
        - []
      parameters:
        - name: userUuid
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: messageUuid
          in: path
          required: true
          schema:
            type: string
            format: uuid
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
        '204':
          description: Message deleted successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/deleteMessage_Response_204'
        '400':
          description: Message cannot be deleted (e.g., purchased content)
          content: {}
        '401':
          description: Unauthorized Response
          content: {}
        '403':
          description: Unauthorized Response
          content: {}
        '404':
          description: Not Found Response
          content: {}
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    deleteMessage_Response_204:
      type: object
      properties: {}
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/chats/userUuid/messages/messageUuid"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.delete(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/chats/userUuid/messages/messageUuid'
const options = {
  method: 'DELETE',
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

	url := "https://api.fanvue.com/chats/userUuid/messages/messageUuid"

	req, _ := http.NewRequest("DELETE", url, nil)

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

url = URI("https://api.fanvue.com/chats/userUuid/messages/messageUuid")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Delete.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.delete("https://api.fanvue.com/chats/userUuid/messages/messageUuid")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('DELETE', 'https://api.fanvue.com/chats/userUuid/messages/messageUuid', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/chats/userUuid/messages/messageUuid");
var request = new RestRequest(Method.DELETE);
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/chats/userUuid/messages/messageUuid")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "DELETE"
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
