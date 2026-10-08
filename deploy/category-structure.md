# Category Structure

Every category node has the following fields:

| Field | Meaning |
| --- | --- |
| `code` | Unique business code across the catalog, normalized to uppercase. |
| `slug` | Stable URL and product assignment identifier. |
| `name` | Customer-facing display name. |
| `displayOrder` | Non-negative integer that sorts nodes within the same parent. |
| `parentSlug` | Immediate parent slug; `null` for a main category. Derived from the tree rather than accepted as a separate editable value. |
| `subcategories` | Ordered list of child nodes using the same structure. |
| `image` | Main category image path. |

```json
{
  "slug": "bats",
  "code": "BAT",
  "name": "Cricket bats",
  "displayOrder": 10,
  "parentSlug": null,
  "image": "category-cricket-bats.png",
  "subcategories": [
    {
      "slug": "english-willow",
      "code": "BAT-EW",
      "name": "English willow",
      "displayOrder": 10,
      "parentSlug": "bats",
      "subcategories": [
        {
          "slug": "grade-1",
          "code": "BAT-EW-G1",
          "name": "Grade 1",
          "displayOrder": 10,
          "parentSlug": "english-willow",
          "subcategories": []
        }
      ]
    }
  ]
}
```

Codes allow 1 to 128 letters, numbers, hyphens, or underscores. Leaving a code blank generates one from the stable slug and main-category slug. Existing codes do not change when names, order, or parents change.

Slugs are unique within a main category's tree, including its root. Products retain their main `category` slug and a `subcategory` slug. Selecting a parent in the storefront includes products assigned to all descendants.

Lower display-order values appear first. Equal values keep their existing relative order. Reparenting preserves a node's code, slug, and display order. Up to eight subcategory levels and 200 descendants per main category are supported.

Legacy nodes receive codes, order, and parent metadata automatically. Saving a category persists the normalized tree. The same ordering is used in the admin hierarchy, product selectors, header menus, and collection filters.
