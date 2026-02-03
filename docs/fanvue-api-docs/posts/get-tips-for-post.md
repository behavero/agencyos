# Get tips for a post

GET https://api.fanvue.com/posts/{uuid}/tips

Returns a paginated list of tips received on a specific post. Only the post owner can view tips.

    <Info>Scope required: `read:post`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/posts/get-post-tips

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get tips for a post
  version: endpoint_.getPostTips
paths:
  /posts/{uuid}/tips:
    get:
      operationId: get-post-tips
      summary: Get tips for a post
      description: >-
        Returns a paginated list of tips received on a specific post. Only the
        post owner can view tips.

            <Info>Scope required: `read:post`</Info>
      tags:
        - []
      parameters:
        - name: uuid
          in: path
          description: UUID of the post to retrieve tips for
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
          description: List of tips received on this post
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/getPostTips_Response_200'
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
          description: Not Found Response
          content: {}
        '410':
          description: API version no longer supported (sunset)
          content: {}
components:
  schemas:
    PostsUuidTipsGetResponsesContentApplicationJsonSchemaDataItemsUser:
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
    PostsUuidTipsGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        user:
          oneOf:
            - $ref: >-
                #/components/schemas/PostsUuidTipsGetResponsesContentApplicationJsonSchemaDataItemsUser
            - type: 'null'
          description: User who sent the tip (null if user was deleted)
        createdAt:
          type: string
          format: date
          description: Date/time when the tip was paid
        gross:
          type: number
          format: double
          description: Gross amount of the tip in cents
        net:
          type: number
          format: double
          description: Net amount of the tip in cents (after platform fees)
      required:
        - user
        - createdAt
        - gross
        - net
    PostsUuidTipsGetResponsesContentApplicationJsonSchemaPagination:
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
    getPostTips_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/PostsUuidTipsGetResponsesContentApplicationJsonSchemaDataItems
          description: Array of tips received on this post
        pagination:
          $ref: >-
            #/components/schemas/PostsUuidTipsGetResponsesContentApplicationJsonSchemaPagination
          description: Pagination information
      required:
        - data
        - pagination
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/posts/uuid/tips"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/posts/uuid/tips'
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

	url := "https://api.fanvue.com/posts/uuid/tips"

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

url = URI("https://api.fanvue.com/posts/uuid/tips")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/posts/uuid/tips")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/posts/uuid/tips', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/posts/uuid/tips");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/posts/uuid/tips")! as URL,
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
