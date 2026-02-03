# Rename a custom list

PATCH https://api.fanvue.com/chats/lists/custom/{uuid}
Content-Type: application/json

Update the name of an existing custom list.

<Info>Scope required: `write:chat`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/chat-custom-lists/update-custom-list

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Rename a custom list
  version: endpoint_.updateCustomList
paths:
  /chats/lists/custom/{uuid}:
    patch:
      operationId: update-custom-list
      summary: Rename a custom list
      description: |-
        Update the name of an existing custom list.

        <Info>Scope required: `write:chat`</Info>
      tags:
        - []
      parameters:
        - name: uuid
          in: path
          description: Custom list UUID
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
          description: Custom list updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/updateCustomList_Response_204'
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
          description: Custom list not found
          content: {}
        '409':
          description: A list with this name already exists
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
                name:
                  type: string
                  description: New name for the custom list
              required:
                - name
components:
  schemas:
    updateCustomList_Response_204:
      type: object
      properties: {}
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/chats/lists/custom/uuid"

payload = { "name": "string" }
headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.patch(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/chats/lists/custom/uuid'
const options = {
  method: 'PATCH',
  headers: {
    'X-Fanvue-API-Version': '2025-06-26',
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: '{"name":"string"}',
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

	url := "https://api.fanvue.com/chats/lists/custom/uuid"

	payload := strings.NewReader("{\n  \"name\": \"string\"\n}")

	req, _ := http.NewRequest("PATCH", url, payload)

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

url = URI("https://api.fanvue.com/chats/lists/custom/uuid")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"name\": \"string\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.patch("https://api.fanvue.com/chats/lists/custom/uuid")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"name\": \"string\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('PATCH', 'https://api.fanvue.com/chats/lists/custom/uuid', [
  'body' => '{
  "name": "string"
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
var client = new RestClient("https://api.fanvue.com/chats/lists/custom/uuid");
var request = new RestRequest(Method.PATCH);
request.AddHeader("X-Fanvue-API-Version", "2025-06-26");
request.AddHeader("Authorization", "Bearer <token>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"name\": \"string\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-Fanvue-API-Version": "2025-06-26",
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
]
let parameters = ["name": "string"] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/chats/lists/custom/uuid")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "PATCH"
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
