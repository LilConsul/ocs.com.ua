# Security policy

## Reporting a vulnerability

Do not open a public issue for a security problem. Email **info@ocs.com.ua** with the subject `Security: ocs.com.ua` and include:

- what you found and where (URL, route or file);
- steps to reproduce, and the impact you expect;
- your contact details, if you want a reply.

We acknowledge reports within 5 working days and tell you when the issue is fixed. Please give us a reasonable time to fix it before you disclose it.

## Scope

In scope: the website at https://ocs.com.ua, https://dev.ocs.com.ua and the code in this repository. The areas that handle user data or credentials are:

- the contact form (`/api/contact`) and its reCAPTCHA check;
- the datasheet request and download flow (`/api/datasheet-request`, `/api/datasheet`) and its signed tokens;
- the Decap CMS login through GitHub OAuth (`/api/auth`, `/admin`);
- the deploy pipeline in `.github/` and the server scripts in `application/infra/`.

Out of scope: denial-of-service and volumetric attacks, social engineering of our staff, and findings in third-party services (GitHub, Google reCAPTCHA, the hosting provider).

## Secrets

No secret values are stored in this repository. `.github/secrets.*.yaml` list names only. If you find a real credential in the code or its history, report it as above.

## Supported versions

Only the current `main` branch, which is what runs on https://ocs.com.ua, receives fixes.
