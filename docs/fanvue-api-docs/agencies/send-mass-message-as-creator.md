# Send a mass message as creator

POST https://api.fanvue.com/creators/{creatorUserUuid}/chats/mass-messages
Content-Type: application/json

Send a message to multiple users based on selected lists as a creator.

    <Info>Scopes required: `write:chat`, `read:creator`, `read:fan`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/agencies/send-creator-mass-message

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Send a mass message as creator
  version: endpoint_.sendCreatorMassMessage
paths:
  /creators/{creatorUserUuid}/chats/mass-messages:
    post:
      operationId: send-creator-mass-message
      summary: Send a mass message as creator
      description: |-
        Send a message to multiple users based on selected lists as a creator.

            <Info>Scopes required: `write:chat`, `read:creator`, `read:fan`</Info>
      tags:
        - []
      parameters:
        - name: creatorUserUuid
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
        '201':
          description: Mass message sent successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/sendCreatorMassMessage_Response_201'
        '400':
          description: >-
            Bad Request - API version not supported OR user contactability
            validation failed OR message validation failed
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                mediaUuids:
                  type: array
                  items:
                    type: string
                    format: uuid
                price:
                  type:
                    - number
                    - 'null'
                  format: double
                includedLists:
                  $ref: >-
                    #/components/schemas/CreatorsCreatorUserUuidChatsMassMessagesPostRequestBodyContentApplicationJsonSchemaIncludedLists
                excludedLists:
                  $ref: >-
                    #/components/schemas/CreatorsCreatorUserUuidChatsMassMessagesPostRequestBodyContentApplicationJsonSchemaExcludedLists
              required:
                - includedLists
components:
  schemas:
    CreatorsCreatorUserUuidChatsMassMessagesPostRequestBodyContentApplicationJsonSchemaIncludedListsSmartListUuidsItems:
      type: string
      enum:
        - value: subscribers
        - value: auto_renewing
        - value: non_renewing
        - value: followers
        - value: free_trial_subscribers
        - value: expired_subscribers
        - value: spent_more_than_50
    CreatorsCreatorUserUuidChatsMassMessagesPostRequestBodyContentApplicationJsonSchemaIncludedLists:
      type: object
      properties:
        smartListUuids:
          type: array
          items:
            $ref: >-
              #/components/schemas/CreatorsCreatorUserUuidChatsMassMessagesPostRequestBodyContentApplicationJsonSchemaIncludedListsSmartListUuidsItems
        customListUuids:
          type: array
          items:
            type: string
            format: uuid
    CreatorsCreatorUserUuidChatsMassMessagesPostRequestBodyContentApplicationJsonSchemaExcludedListsSmartListUuidsItems:
      type: string
      enum:
        - value: subscribers
        - value: auto_renewing
        - value: non_renewing
        - value: followers
        - value: free_trial_subscribers
        - value: expired_subscribers
        - value: spent_more_than_50
    CreatorsCreatorUserUuidChatsMassMessagesPostRequestBodyContentApplicationJsonSchemaExcludedLists:
      type: object
      properties:
        smartListUuids:
          type: array
          items:
            $ref: >-
              #/components/schemas/CreatorsCreatorUserUuidChatsMassMessagesPostRequestBodyContentApplicationJsonSchemaExcludedListsSmartListUuidsItems
        customListUuids:
          type: array
          items:
            type: string
            format: uuid
    sendCreatorMassMessage_Response_201:
      type: object
      properties:
        id:
          type: string
          format: uuid
        recipientCount:
          type: number
          format: double
        createdAt:
          type: string
          format: date
      required:
        - id
        - recipientCount
        - createdAt
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/creators/creatorUserUuid/chats/mass-messages"

payload = {}
headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/creators/creatorUserUuid/chats/mass-messages'
const options = {
  method: 'POST',
  headers: {
    'X-Fanvue-API-Version': '2025-06-26',
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: '{}',
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
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.fanvue.com/creators/creatorUserUuid/chats/mass-messages"

	payload := strings.NewReader("{}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("X-Fanvue-API-Version", "2025-06-26")
	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "application/json")

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

url = URI("https://api.fanvue.com/creators/creatorUserUuid/chats/mass-messages")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.fanvue.com/creators/creatorUserUuid/chats/mass-messages")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.fanvue.com/creators/creatorUserUuid/chats/mass-messages', [
  'body' => '{}',
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'Content-Type' => 'application/json',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/creators/creatorUserUuid/chats/mass-messages");
var request = new RestRequest(Method.POST);
request.AddHeader("X-Fanvue-API-Version", "2025-06-26");
request.AddHeader("Authorization", "Bearer <token>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-Fanvue-API-Version": "2025-06-26",
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
]
let parameters = [] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/creators/creatorUserUuid/chats/mass-messages")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

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
