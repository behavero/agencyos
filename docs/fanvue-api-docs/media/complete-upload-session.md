# Complete upload session

PATCH https://api.fanvue.com/media/uploads/{uploadId}
Content-Type: application/json

Complete multipart upload in S3 and set media status to processing.
Media URLs will be available once processing completes.

    <Info>Scope required: `write:media`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/media/complete-upload-session

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Complete upload session
  version: endpoint_.completeUploadSession
paths:
  /media/uploads/{uploadId}:
    patch:
      operationId: complete-upload-session
      summary: Complete upload session
      description: |-
        Complete multipart upload in S3 and set media status to processing.
            Media URLs will be available once processing completes.

            <Info>Scope required: `write:media`</Info>
      tags:
        - []
      parameters:
        - name: uploadId
          in: path
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
        '200':
          description: Upload session completed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/completeUploadSession_Response_200'
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
                parts:
                  type: array
                  items:
                    $ref: >-
                      #/components/schemas/MediaUploadsUploadIdPatchRequestBodyContentApplicationJsonSchemaPartsItems
components:
  schemas:
    MediaUploadsUploadIdPatchRequestBodyContentApplicationJsonSchemaPartsItems:
      type: object
      properties:
        ETag:
          type: string
        PartNumber:
          type: number
          format: double
      required:
        - PartNumber
    MediaUploadsUploadIdPatchResponsesContentApplicationJsonSchemaStatus:
      type: string
      enum:
        - value: created
        - value: processing
        - value: ready
        - value: error
    completeUploadSession_Response_200:
      type: object
      properties:
        status:
          $ref: >-
            #/components/schemas/MediaUploadsUploadIdPatchResponsesContentApplicationJsonSchemaStatus
      required:
        - status
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/media/uploads/uploadId"

payload = {}
headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.patch(url, json=payload, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/media/uploads/uploadId'
const options = {
  method: 'PATCH',
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

	url := "https://api.fanvue.com/media/uploads/uploadId"

	payload := strings.NewReader("{}")

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

url = URI("https://api.fanvue.com/media/uploads/uploadId")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Patch.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.patch("https://api.fanvue.com/media/uploads/uploadId")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('PATCH', 'https://api.fanvue.com/media/uploads/uploadId', [
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
var client = new RestClient("https://api.fanvue.com/media/uploads/uploadId");
var request = new RestRequest(Method.PATCH);
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/media/uploads/uploadId")! as URL,
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
