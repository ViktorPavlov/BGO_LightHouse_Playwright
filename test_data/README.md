# Environment Configuration

## env.json

This project uses `env.json` for environment-specific configuration. This file is gitignored to prevent committing environment-specific URLs and other configurations.

### Setup Instructions

1. Create a new `env.json` file in the `test_data` directory
2. Copy the structure from `env.template.json`
3. Update the URLs to match your environment

Example structure:

```json
{
    "prod_urls": {
        "homepage": "https://your-site.com/",
        "about": "https://your-site.com/about",
        "contact": "https://your-site.com/contact"
    },
    "lessons_urls": {
        "example-lesson": "https://your-site.com/lessons/example"
    }
}
```

## Fallback Mechanism

The application will try to load configuration in the following order:

1. `test_data/env.json` (preferred, gitignored)
2. `fixed_env.json` (in project root)
3. `test_data/env.template.json` (template with example values)

If none of these files are found, the application will use an empty object for URLs.
