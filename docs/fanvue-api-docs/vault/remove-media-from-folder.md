# Remove media from folder

DELETE https://api.fanvue.com/vault/folders/{folderName}/media/{mediaUuid}

Remove a media item from the specified folder.
The media item itself is not deleted, only the folder association.

<Info>Scope required: `write:media`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/vault/detach-media-from-vault-folder

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Remove media from folder
  version: endpoint_.detachMediaFromVaultFolder
paths:
  /vault/folders/{folderName}/media/{mediaUuid}:
    delete:
      operationId: detach-media-from-vault-folder
      summary: Remove media from folder
      description: |-
        Remove a media item from the specified folder.
        The media item itself is not deleted, only the folder association.

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
        - name: mediaUuid
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
        '204':
          description: Media removed from folder
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/detachMediaFromVaultFolder_Response_204'
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
components:
  schemas:
    detachMediaFromVaultFolder_Response_204:
      type: object
      properties: {}
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/vault/folders/folderName/media/mediaUuid"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.delete(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/vault/folders/folderName/media/mediaUuid'
const options = {
  method: 'DELETE',
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

	url := "https://api.fanvue.com/vault/folders/folderName/media/mediaUuid"

	req, _ := http.NewRequest("DELETE", url, nil)

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

url = URI("https://api.fanvue.com/vault/folders/folderName/media/mediaUuid")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Delete.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.delete("https://api.fanvue.com/vault/folders/folderName/media/mediaUuid")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('DELETE', 'https://api.fanvue.com/vault/folders/folderName/media/mediaUuid', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/vault/folders/folderName/media/mediaUuid");
var request = new RestRequest(Method.DELETE);
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/vault/folders/folderName/media/mediaUuid")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "DELETE"
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
