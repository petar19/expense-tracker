import ExpenseList from '../features/expenses/ExpenseList.svelte';
import Groups from '../features/groups/Groups.svelte';
import GroupDetail from '../features/groups/GroupDetail.svelte';
import Stats from '../features/stats/Stats.svelte';
import SettleUp from '../features/settleup/SettleUp.svelte';
import Migration from '../features/migration/Migration.svelte';
import ExportImport from '../features/export-import/ExportImport.svelte';
import AllowlistAdmin from '../features/allowlist-admin/AllowlistAdmin.svelte';
import CategoryAdmin from '../features/categories/CategoryAdmin.svelte';

export const routes = {
  '/': ExpenseList,
  '/groups': Groups,
  '/groups/:groupId': GroupDetail,
  '/stats': Stats,
  '/settleup': SettleUp,
  '/categories': CategoryAdmin,
  '/admin/allowlist': AllowlistAdmin,
  '/admin/migrate': Migration,
  '/export-import': ExportImport,
};
