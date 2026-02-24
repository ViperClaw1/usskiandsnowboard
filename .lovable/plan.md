
The goal is to improve the administrative experience for writing training articles by providing HTML syntax highlighting in the article body editor. Since the project currently uses a standard plain-text `Textarea`, I will create a new reusable `RichTextarea` component that uses a common "overlay" technique to provide real-time highlighting of HTML tags, attributes, and values.

### 1. Create the `RichTextarea` Component
I will create a new UI component `src/components/ui/rich-textarea.tsx`. This component will:
- Use a `relative` container to house both a background `pre` element and a foreground `textarea`.
- The `textarea` will be styled with `text-transparent` and `bg-transparent`, but will retain a visible `caret-foreground`. This allows the user to interact with the text (typing, selecting, scrolling) while seeing the highlighted version rendered by the `pre` tag behind it.
- Implement a `highlightHTML` function that uses regular expressions to identify and wrap HTML tags, attributes, and values in colored `<span>` elements using Tailwind CSS utility classes.
- Ensure perfect synchronization of scrolling, padding, font size (`font-mono text-sm`), and line height between the two elements.

### 2. Update `TrainingArticleManager.tsx`
I will modify `src/components/dashboard/admin/TrainingArticleManager.tsx` to integrate the new component:
- Update the imports to include `RichTextarea` instead of `Textarea` for the article body.
- Replace the article body input field with the `RichTextarea` component.
- The state management (`form.body` and `onChange`) will remain identical, making the transition seamless.

### Technical Details & Highlights
- **Syntax Highlighting Colors**: 
  - **Tags**: Blue (`text-blue-600` / `text-blue-400`)
  - **Attributes**: Sky Blue (`text-sky-500`)
  - **Attribute Values**: Amber/Orange (`text-amber-600` / `text-amber-400`)
- **Accessibility**: The background `pre` element will have `aria-hidden="true"` and `pointer-events: none` to ensure it doesn't interfere with screen readers or user interactions.
- **Maintenance**: The component is built using standard React and Tailwind, avoiding the need for heavy external code editor libraries while fulfilling the specific requirement for HTML tag highlighting.

```text
File changes:
- Create src/components/ui/rich-textarea.tsx
- Modify src/components/dashboard/admin/TrainingArticleManager.tsx
```