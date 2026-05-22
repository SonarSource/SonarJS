declare module 'dompurify' {
  const DOMPurify: {
    sanitize(html: string, config?: object): string;
  };
  export default DOMPurify;
}

import DOMPurify from 'dompurify';

const html = '<div>test</div>';
DOMPurify.sanitize(html, {
  ADD_TAGS: ['custom-element'],
  SANITIZE_DOM: true,
});
