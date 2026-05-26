const REPO = 'osuritz/react-kit';
const BRANCH = 'main';

export const repoRootUrl = `https://github.com/${REPO}`;

export function repoTreeUrl(path: string): string {
  return `${repoRootUrl}/tree/${BRANCH}/${path}`;
}

export function repoBlobUrl(path: string): string {
  return `${repoRootUrl}/blob/${BRANCH}/${path}`;
}
