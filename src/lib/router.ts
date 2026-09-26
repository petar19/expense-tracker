import ExpenseList from '../features/expenses/ExpenseList.svelte';
import Settings from '../features/groups/Settings.svelte';
import Stats from '../features/stats/Stats.svelte';
import SettleUp from '../features/settleup/SettleUp.svelte';
import ExportImport from '../features/export-import/ExportImport.svelte';
import CategoryAdmin from '../features/categories/CategoryAdmin.svelte';
import Documents from '../features/documents/Documents.svelte';

export const routes = {
  '/': ExpenseList,
  '/settings': Settings,
  '/documents': Documents,
  '/stats': Stats,
  '/settleup': SettleUp,
  '/categories': CategoryAdmin,
  '/export-import': ExportImport,
};
