<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN: using mantine with next-->
Server components

All Mantine components require context to support default props and Styles API. Mantine components cannot be used as server components. This means that components will render both on the server and client.

Entry points of all @mantine/* packages (index.js files) have the 'use client'; directive at the top of the file – you don't need to add 'use client'; to your pages/layouts/components.
Compound components in server components

Some components like Popover have associated compound components (Component.XXX), where XXX is a compound component name. Compound components cannot be used in server components. Instead, use the ComponentXXX syntax or add the 'use client'; directive to the top of the file.

Example that won't work in server components:

import { Popover } from '@mantine/core';

// This will throw an error
export default function Page() {
  return (
    <Popover>
      <Popover.Target>Target</Popover.Target>
      <Popover.Dropdown>Dropdown</Popover.Dropdown>
    </Popover>
  );
}

Example with 'use client'; directive:

'use client';

import { Popover } from '@mantine/core';

// No error
export default function Page() {
  return (
    <Popover>
      <Popover.Target>Target</Popover.Target>
      <Popover.Dropdown>Dropdown</Popover.Dropdown>
    </Popover>
  );
}

Example with ComponentXXX syntax:

import {
  Popover,
  PopoverDropdown,
  PopoverTarget,
} from '@mantine/core';

// No error
export default function Page() {
  return (
    <Popover>
      <PopoverTarget>Trigger</PopoverTarget>
      <PopoverDropdown>Dropdown</PopoverDropdown>
    </Popover>
  );
}
<!-- END: using mantine with next-->
