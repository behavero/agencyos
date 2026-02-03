# How to Populate the Fanvue API Documentation

## Quick Start

1. **Find the endpoint** in the folder structure:

   ```
   docs/fanvue-api-docs/{category}/{endpoint-name}.md
   ```

2. **Copy from Fanvue docs**:
   - Go to https://api.fanvue.com/docs/api-reference
   - Find the endpoint
   - Copy the entire page content

3. **Paste into the .md file**:
   - Open the corresponding file
   - Paste the OpenAPI spec, description, and code examples
   - Follow the `_TEMPLATE.md` structure if needed

## Example Workflow

### Step 1: Find the Endpoint

You want to document "Get creator followers"

Location: `docs/fanvue-api-docs/agencies/get-creator-followers.md`

### Step 2: Copy from Fanvue

Visit: https://api.fanvue.com/docs/api-reference/reference/agencies/list-creator-followers

Copy everything including:

- Title and description
- Required scopes
- OpenAPI YAML
- SDK code examples (JavaScript, Python, Go, etc.)

### Step 3: Paste

Open `agencies/get-creator-followers.md` and paste:

```markdown
# Get creator followers

GET https://api.fanvue.com/creators/{creatorUserUuid}/followers

Returns a paginated list of users who follow the specified creator.

<Info>Scopes required: `read:creator`, `read:fan`</Info>

Reference: https://api.fanvue.com/docs/api-reference/reference/agencies/list-creator-followers

## OpenAPI Specification

[paste YAML here]

## SDK Code Examples

[paste all language examples]
```

## Benefits

Once populated, I can:

- ✅ Reference exact API specs when implementing features
- ✅ See parameter types and validation rules
- ✅ Copy SDK code examples for implementation
- ✅ Understand relationships between endpoints
- ✅ Find related endpoints quickly

## Priority Order

Populate in this order based on current project needs:

### **High Priority** (Already using)

1. ✅ `agencies/get-creator-earnings.md` (already implemented)
2. ✅ `agencies/get-creator-followers.md` (already implemented)
3. ✅ `agencies/get-creator-subscribers.md` (already implemented)
4. ✅ `agencies/get-chats-of-creator.md` (already implemented)
5. ✅ `agencies/get-creator-smart-lists.md` (already implemented)

### **Medium Priority** (Planned features)

6. `posts/get-list-of-posts.md` (for Posts count)
7. `posts/get-likes-for-post.md` (for Likes count)
8. `agencies/get-messages-between-creator-and-user.md` (for Messages feature)
9. `agencies/send-message-as-creator.md` (for Messaging feature)
10. `agencies/send-mass-message-as-creator.md` (for Mass messaging)

### **Low Priority** (Future features)

11. `vault/*` (Vault management)
12. `media/*` (Media uploads)
13. `tracking-links/*` (Marketing features)
14. Everything else

## File Naming Convention

The files are named based on the action:

- `get-*` = GET requests (retrieving data)
- `create-*` = POST requests (creating new items)
- `update-*` or `rename-*` = PATCH requests (modifying existing)
- `delete-*` = DELETE requests (removing items)
- `send-*` = POST requests (sending messages/data)
- `list-*` = GET requests (listing multiple items)

## Tips

- **Keep formatting**: Preserve the markdown, code blocks, and YAML structure
- **Include everything**: Don't skip the OpenAPI spec - it has validation rules
- **Add notes**: If you discover implementation quirks, add them in "Implementation Notes"
- **Link related**: Connect related endpoints using markdown links
- **Update README**: If you add new insights, update the main README.md

## Questions?

If you're unsure which file to populate:

1. Check the README.md index
2. Search by endpoint URL or method
3. Look at the folder structure for logical grouping

Start with the **High Priority** list above - those are the endpoints you're actively using!
