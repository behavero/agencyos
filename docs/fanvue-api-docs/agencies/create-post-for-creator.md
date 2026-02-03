# Create a new post for a creator

POST https://api.fanvue.com/creators/{creatorUserUuid}/posts
Content-Type: application/json

Create a new post on behalf of a creator with optional media, text, and pricing.

    <Info>Scopes required: `write:post`, `write:creator`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/agencies/create-creator-post

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Create a new post for a creator
  version: endpoint_.createCreatorPost
paths:
  /creators/{creatorUserUuid}/posts:
    post:
      operationId: create-creator-post
      summary: Create a new post for a creator
      description: >-
        Create a new post on behalf of a creator with optional media, text, and
        pricing.

            <Info>Scopes required: `write:post`, `write:creator`</Info>
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
          description: Post created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/createCreatorPost_Response_201'
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
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                text:
                  type: string
                  description: Text content of the post
                mediaUuids:
                  type: array
                  items:
                    type: string
                    format: uuid
                  description: Array of media UUIDs to attach to the post
                price:
                  type: number
                  format: double
                  description: Price in cents for paid posts (requires media)
                audience:
                  $ref: '#/components/schemas/PostAudience'
                publishAt:
                  type: string
                  format: date-time
                  description: Future date/time to publish the post (ISO 8601 format)
                expiresAt:
                  type: string
                  format: date-time
                  description: Date/time when the post expires (ISO 8601 format)
              required:
                - audience
components:
  schemas:
    PostAudience:
      type: string
      enum:
        - value: subscribers
        - value: followers-and-subscribers
    createCreatorPost_Response_201:
      type: object
      properties:
        uuid:
          type: string
          format: uuid
          description: Unique identifier of the created post
        createdAt:
          type: string
          format: date-time
          description: Date/time when the post was created (ISO 8601 format)
        text:
          type:
            - string
            - 'null'
          description: Text content of the post
        price:
          type:
            - number
            - 'null'
          format: double
          description: Price in cents for paid posts
        audience:
          $ref: '#/components/schemas/PostAudience'
        publishAt:
          type:
            - string
            - 'null'
          format: date-time
          description: Future date/time when the post will be published (ISO 8601 format)
        publishedAt:
          type:
            - string
            - 'null'
          format: date-time
          description: Date/time when the post was published (ISO 8601 format)
        expiresAt:
          type:
            - string
            - 'null'
          format: date-time
          description: Date/time when the post expires (ISO 8601 format)
      required:
        - uuid
        - createdAt
        - text
        - price
        - audience
        - publishAt
        - publishedAt
        - expiresAt
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/creators/creatorUserUuid/posts"

payload = { "audience": "subscribers" }
headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/creators/creatorUserUuid/posts'
const options = {
  method: 'POST',
  headers: {
    'X-Fanvue-API-Version': '2025-06-26',
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: '{"audience":"subscribers"}',
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

	url := "https://api.fanvue.com/creators/creatorUserUuid/posts"

	payload := strings.NewReader("{\n  \"audience\": \"subscribers\"\n}")

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

url = URI("https://api.fanvue.com/creators/creatorUserUuid/posts")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"audience\": \"subscribers\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.fanvue.com/creators/creatorUserUuid/posts")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"audience\": \"subscribers\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.fanvue.com/creators/creatorUserUuid/posts', [
  'body' => '{
  "audience": "subscribers"
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
var client = new RestClient("https://api.fanvue.com/creators/creatorUserUuid/posts");
var request = new RestRequest(Method.POST);
request.AddHeader("X-Fanvue-API-Version", "2025-06-26");
request.AddHeader("Authorization", "Bearer <token>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"audience\": \"subscribers\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-Fanvue-API-Version": "2025-06-26",
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
]
let parameters = ["audience": "subscribers"] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/creators/creatorUserUuid/posts")! as URL,
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
