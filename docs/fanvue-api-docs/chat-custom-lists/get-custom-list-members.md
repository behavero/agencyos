# Get custom list members

GET https://api.fanvue.com/chats/lists/custom/{uuid}

Get members of a specific custom list with pagination.

<Info>Scope required: `read:chat` `read:fan`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/chat-custom-lists/get-custom-list-members

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get custom list members
  version: endpoint_.getCustomListMembers
paths:
  /chats/lists/custom/{uuid}:
    get:
      operationId: get-custom-list-members
      summary: Get custom list members
      description: |-
        Get members of a specific custom list with pagination.

        <Info>Scope required: `read:chat` `read:fan`</Info>
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
          description: Custom list members
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getCustomListMembers_Response_200'
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
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    ChatsListsCustomUuidGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
          description: User UUID
        displayName:
          type: string
          description: User's display name
        handle:
          type: string
          description: User's handle
        isCreator:
          type: boolean
          description: Whether user is a creator
      required:
        - uuid
        - displayName
        - handle
        - isCreator
    ChatsListsCustomUuidGetResponsesContentApplicationJsonSchemaPagination:
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
    getCustomListMembers_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/ChatsListsCustomUuidGetResponsesContentApplicationJsonSchemaDataItems
          description: Members of the custom list
        pagination:
          $ref: >-
            #/components/schemas/ChatsListsCustomUuidGetResponsesContentApplicationJsonSchemaPagination
          description: Pagination information
      required:
        - data
        - pagination
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/chats/lists/custom/uuid"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/chats/lists/custom/uuid'
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

	url := "https://api.fanvue.com/chats/lists/custom/uuid"

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

url = URI("https://api.fanvue.com/chats/lists/custom/uuid")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/chats/lists/custom/uuid")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/chats/lists/custom/uuid', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/chats/lists/custom/uuid");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/chats/lists/custom/uuid")! as URL,
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
