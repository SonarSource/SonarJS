import { QueryClient } from '@tanstack/react-query';
const queryClient = new QueryClient();
export function refresh(): void {
  void queryClient.invalidateQueries({ queryKey: ['todos'] });
}
