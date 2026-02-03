# Get a single template message

GET https://api.fanvue.com/chats/templates/{templateUuid}

Returns a specific template message by UUID.

<Info>Scope required: `read:chat`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/chat-templates/get-template-message

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get a single template message
  version: endpoint_.getTemplateMessage
paths:
  /chats/templates/{templateUuid}:
    get:
      operationId: get-template-message
      summary: Get a single template message
      description: |-
        Returns a specific template message by UUID.

        <Info>Scope required: `read:chat`</Info>
      tags:
        - []
      parameters:
        - name: templateUuid
          in: path
          description: Template message UUID
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
        '200':
          description: Template message details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getTemplateMessage_Response_200'
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
          description: Template message not found
          content: {}
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    getTemplateMessage_Response_200:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
          description: Template message UUID
        text:
          type:
            - string
            - 'null'
          description: Message text content
        price:
          type:
            - number
            - 'null'
          format: double
          description: Message price in cents (null for free messages)
        mediaUuids:
          type: array
          items:
            type: string
            format: uuid
          description: Array of media UUIDs attached to the message
        folderName:
          type:
            - string
            - 'null'
          description: Name of the folder containing this template
      required:
        - uuid
        - text
        - price
        - mediaUuids
        - folderName
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/chats/templates/templateUuid"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/chats/templates/templateUuid'
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

	url := "https://api.fanvue.com/chats/templates/templateUuid"

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

url = URI("https://api.fanvue.com/chats/templates/templateUuid")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/chats/templates/templateUuid")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/chats/templates/templateUuid', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/chats/templates/templateUuid");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/chats/templates/templateUuid")! as URL,
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
