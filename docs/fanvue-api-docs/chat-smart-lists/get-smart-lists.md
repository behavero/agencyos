# Get smart lists

GET https://api.fanvue.com/chats/lists/smart

Get all available smart lists with member counts.

<Info>Scope required: `read:chat` `read:fan`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/chat-smart-lists/get-smart-lists

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get smart lists
  version: endpoint_.getSmartLists
paths:
  /chats/lists/smart:
    get:
      operationId: get-smart-lists
      summary: Get smart lists
      description: |-
        Get all available smart lists with member counts.

        <Info>Scope required: `read:chat` `read:fan`</Info>
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
          description: List of smart lists
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: >-
                    #/components/schemas/ChatsListsSmartGetResponsesContentApplicationJsonSchemaItems
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
    ChatsListsSmartGetResponsesContentApplicationJsonSchemaItemsUuid:
      type: string
      enum:
        - value: subscribers
        - value: auto_renewing
        - value: non_renewing
        - value: followers
        - value: free_trial_subscribers
        - value: expired_subscribers
        - value: spent_more_than_50
    ChatsListsSmartGetResponsesContentApplicationJsonSchemaItems:
      type: object
      properties:
        name:
          type: string
          description: Display name of the smart list
        uuid:
          $ref: >-
            #/components/schemas/ChatsListsSmartGetResponsesContentApplicationJsonSchemaItemsUuid
          description: Smart list unique identifier
        count:
          type: number
          format: double
          description: Number of members in this list
      required:
        - name
        - uuid
        - count
```

## SDK Code Examples

```python
import requests

url = "https://api.fanvue.com/chats/lists/smart"

headers = {
    "X-Fanvue-API-Version": "2025-06-26",
    "Authorization": "Bearer <token>"
}

response = requests.get(url, headers=headers)

print(response.json())
```

```javascript
const url = 'https://api.fanvue.com/chats/lists/smart'
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

	url := "https://api.fanvue.com/chats/lists/smart"

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

url = URI("https://api.fanvue.com/chats/lists/smart")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-Fanvue-API-Version"] = '2025-06-26'
request["Authorization"] = 'Bearer <token>'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.fanvue.com/chats/lists/smart")
  .header("X-Fanvue-API-Version", "2025-06-26")
  .header("Authorization", "Bearer <token>")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.fanvue.com/chats/lists/smart', [
  'headers' => [
    'Authorization' => 'Bearer <token>',
    'X-Fanvue-API-Version' => '2025-06-26',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.fanvue.com/chats/lists/smart");
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

let request = NSMutableURLRequest(url: NSURL(string: "https://api.fanvue.com/chats/lists/smart")! as URL,
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
