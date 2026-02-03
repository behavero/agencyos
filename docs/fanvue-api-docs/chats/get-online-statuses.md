# Get online statuses for multiple users

POST https://api.fanvue.com/chats/statuses
Content-Type: application/json

Returns the online status and last seen timestamp for multiple users in a single request.

This endpoint is optimized for batch lookups when you need to check the online status of multiple chat counterparts at once.

<Info>Scope required: `read:chat`</Info>

<Note>Maximum 100 user UUIDs per request. Users who have disabled online visibility will always appear as offline with no last seen timestamp.</Note>

Reference: https://api.fanvue.com/docs/api-reference/reference/chats/get-batch-statuses

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get online statuses for multiple users
  version: endpoint_.getBatchStatuses
paths:
  /chats/statuses:
    post:
      operationId: get-batch-statuses
      summary: Get online statuses for multiple users
      description: >-
        Returns the online status and last seen timestamp for multiple users in
        a single request.


        This endpoint is optimized for batch lookups when you need to check the
        online status of multiple chat counterparts at once.


        <Info>Scope required: `read:chat`</Info>


        <Note>Maximum 100 user UUIDs per request. Users who have disabled online
        visibility will always appear as offline with no last seen
        timestamp.</Note>
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
          description: Online statuses retrieved successfully
          content:
            application/json:
              schema:
                type: object
                additionalProperties:
                  $ref: >-
                    #/components/schemas/ChatsStatusesPostResponsesContentApplicationJsonSchema
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                userUuids:
                  type: array
                  items:
                    type: string
                    format: uuid
                  description: Array of user UUIDs to check online status for (max 100)
              required:
                - userUuids
components:
  schemas:
    ChatsStatusesPostResponsesContentApplicationJsonSchema:
      type: object
      properties:
        isOnline:
          type: boolean
          description: Whether the user is currently online
        lastSeenAt:
          type:
            - string
            - 'null'
          format: date
          description: Last time the user was seen online (UTC)
      required:
        - isOnline
        - lastSeenAt
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/chats/statuses"

payload = { "userUuids": ["string"] }
headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/chats/statuses'
const options = {
  method: 'POST',
  headers: {
    'X-Fanvue-API-Version': '2025-06-26',
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: '{"userUuids":["string"]}',
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

	url := "https://api.fanvue.com/chats/statuses"

	payload := strings.NewReader("{\n  \"userUuids\": [\n    \"string\"\n  ]\n}")

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

url = URI("https://api.fanvue.com/chats/statuses")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"userUuids\": [\n    \"string\"\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.fanvue.com/chats/statuses")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"userUuids\": [\n    \"string\"\n  ]\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.fanvue.com/chats/statuses', [
  'body' => '{
  "userUuids": [
    "string"
  ]
}',
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'Content-Type' => 'application/json',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/chats/statuses");
var request = new RestRequest(Method.POST);
request.AddHeader("X-Fanvue-API-Version", "2025-06-26");
request.AddHeader("Authorization", "Bearer <token>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"userUuids\": [\n    \"string\"\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-Fanvue-API-Version": "2025-06-26",
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
]
let parameters = ["userUuids": ["string"]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/chats/statuses")! as URL,
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
