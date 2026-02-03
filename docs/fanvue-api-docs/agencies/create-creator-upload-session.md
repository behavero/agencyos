# Get signed URL for upload part

GET https://api.fanvue.com/creators/{creatorUserUuid}/media/uploads/{uploadId}/parts/{partNumber}/url

Return a presigned URL to upload a specific part number for creator's media upload session.

    <Info>Scopes required: `write:creator`, `write:media`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/agencies/get-creator-upload-part-url

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get signed URL for upload part
  version: endpoint_.getCreatorUploadPartUrl
paths:
  /creators/{creatorUserUuid}/media/uploads/{uploadId}/parts/{partNumber}/url:
    get:
      operationId: get-creator-upload-part-url
      summary: Get signed URL for upload part
      description: >-
        Return a presigned URL to upload a specific part number for creator's
        media upload session.

            <Info>Scopes required: `write:creator`, `write:media`</Info>
      tags:
        - []
      parameters:
        - name: creatorUserUuid
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: uploadId
          in: path
          required: true
          schema:
            type: string
        - name: partNumber
          in: path
          required: false
          schema:
            type: number
            format: double
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
          description: Response with status 200
          content:
            application/json:
              schema:
                type: object
                properties: {}
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
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/creators/creatorUserUuid/media/uploads/uploadId/parts/1.1/url"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/creators/creatorUserUuid/media/uploads/uploadId/parts/1.1/url'
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

	url := "https://api.fanvue.com/creators/creatorUserUuid/media/uploads/uploadId/parts/1.1/url"

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

url = URI("https://api.fanvue.com/creators/creatorUserUuid/media/uploads/uploadId/parts/1.1/url")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/creators/creatorUserUuid/media/uploads/uploadId/parts/1.1/url")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/creators/creatorUserUuid/media/uploads/uploadId/parts/1.1/url', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/creators/creatorUserUuid/media/uploads/uploadId/parts/1.1/url");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/creators/creatorUserUuid/media/uploads/uploadId/parts/1.1/url")! as URL,
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
