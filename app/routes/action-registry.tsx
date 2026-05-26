import { DropInPage } from '~/components/drop-in-page';
import { ActionRegistryDemo } from '~/components/demos/action-registry';
import actionRegistrySrc from '~/components/demos/action-registry.tsx?shiki';
import { repoBlobUrl, repoTreeUrl } from '~/lib/github';

const DROP_IN_PATH = 'src/hooks/action-registry';

export default function ActionRegistryRoute() {
  return (
    <DropInPage
      title="action-registry"
      description="A drop-in shared registry for app actions — id, label, optional shortcut/group/keywords/icon. The primitive a keybinding hook and a command palette both subscribe to. Provider-scoped, isolated per provider, no DOM, no shortcut parsing — just register/getAll/subscribe."
      sourceHref={repoTreeUrl(DROP_IN_PATH)}
      readmeHref={repoBlobUrl(`${DROP_IN_PATH}/README.md`)}
      demos={[
        {
          title: 'Register and observe',
          description:
            'Three components register actions on mount; a sibling subscribes via useSyncExternalStore and renders the list. Toggle the checkbox to mount/unmount nav.search and watch the list react.',
          source: actionRegistrySrc,
          render: <ActionRegistryDemo />,
        },
      ]}
    />
  );
}
