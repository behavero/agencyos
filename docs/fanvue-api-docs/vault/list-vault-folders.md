# List vault folders

GET https://api.fanvue.com/vault/folders

Returns a paginated list of folders in the authenticated user's vault.

<Info>Scope required: `read:media`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/vault/list-vault-folders

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: List vault folders
  version: endpoint_.listVaultFolders
paths:
  /vault/folders:
    get:
      operationId: list-vault-folders
      summary: List vault folders
      description: |-
        Returns a paginated list of folders in the authenticated user's vault.

        <Info>Scope required: `read:media`</Info>
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
          description: List of vault folders
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/listVaultFolders_Response_200'
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
components:
  schemas:
    VaultFoldersGetResponsesContentApplicationJsonSchemaDataItems:
      type: object
      properties:
        name:
          type: string
          description: Folder name
        createdAt:
          type: string
          format: date
          description: When the folder was created
        mediaCount:
          type: number
          format: double
          description: Number of media items in the folder
      required:
        - name
        - createdAt
        - mediaCount
    VaultFoldersGetResponsesContentApplicationJsonSchemaPagination:
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
    listVaultFolders_Response_200:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: >-
              #/components/schemas/VaultFoldersGetResponsesContentApplicationJsonSchemaDataItems
          description: Array of vault folders
        pagination:
          $ref: >-
            #/components/schemas/VaultFoldersGetResponsesContentApplicationJsonSchemaPagination
          description: Pagination information
      required:
        - data
        - pagination
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/vault/folders"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/vault/folders'
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

	url := "https://api.fanvue.com/vault/folders"

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

url = URI("https://api.fanvue.com/vault/folders")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/vault/folders")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/vault/folders', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/vault/folders");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/vault/folders")! as URL,
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
