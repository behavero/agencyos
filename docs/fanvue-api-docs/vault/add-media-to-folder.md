# Add media to folder

POST https://api.fanvue.com/vault/folders/{folderName}/media
Content-Type: application/json

Add one or more media items to the specified folder.
Media items must belong to the authenticated user.

<Info>Scope required: `write:media`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/vault/attach-media-to-vault-folder

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Add media to folder
  version: endpoint_.attachMediaToVaultFolder
paths:
  /vault/folders/{folderName}/media:
    post:
      operationId: attach-media-to-vault-folder
      summary: Add media to folder
      description: |-
        Add one or more media items to the specified folder.
        Media items must belong to the authenticated user.

        <Info>Scope required: `write:media`</Info>
      tags:
        - []
      parameters:
        - name: folderName
          in: path
          description: Folder name (URL-encoded in path)
          required: true
          schema:
            type: string
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
          description: Media added to folder
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/attachMediaToVaultFolder_Response_201'
        '400':
          description: Bad Request - API version not supported OR validation failed
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
                mediaUuids:
                  type: array
                  items:
                    type: string
                    format: uuid
                  description: UUIDs of media items to attach to the folder
              required:
                - mediaUuids
components:
  schemas:
    attachMediaToVaultFolder_Response_201:
      type: object
      properties:
        addedCount:
          type: number
          format: double
          description: Number of media items successfully added
      required:
        - addedCount
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/vault/folders/folderName/media"

payload = { "mediaUuids": ["string"] }
headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/vault/folders/folderName/media'
const options = {
  method: 'POST',
  headers: {
    'X-Fanvue-API-Version': '2025-06-26',
    Authorization: 'Bearer <token>',
    'Content-Type': 'application/json',
  },
  body: '{"mediaUuids":["string"]}',
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

	url := "https://api.fanvue.com/vault/folders/folderName/media"

	payload := strings.NewReader("{\n  \"mediaUuids\": [\n    \"string\"\n  ]\n}")

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

url = URI("https://api.fanvue.com/vault/folders/folderName/media")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"mediaUuids\": [\n    \"string\"\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.fanvue.com/vault/folders/folderName/media")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"mediaUuids\": [\n    \"string\"\n  ]\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.fanvue.com/vault/folders/folderName/media', [
  'body' => '{
  "mediaUuids": [
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
var client = new RestClient("https://api.fanvue.com/vault/folders/folderName/media");
var request = new RestRequest(Method.POST);
request.AddHeader("X-Fanvue-API-Version", "2025-06-26");
request.AddHeader("Authorization", "Bearer <token>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"mediaUuids\": [\n    \"string\"\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "X-Fanvue-API-Version": "2025-06-26",
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
]
let parameters = ["mediaUuids": ["string"]] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/vault/folders/folderName/media")! as URL,
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
