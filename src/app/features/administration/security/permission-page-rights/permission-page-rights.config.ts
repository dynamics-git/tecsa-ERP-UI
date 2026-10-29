import { DataSourceConfig, HeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';

const source: DataSourceConfig = {endpoint:'/permissionSets',keyField:'systemId',navigation:{parentEndpoint:'/permissionSets',parentIdFields:['systemId'],childCollection:'pageRights'},supportsCreate:false,supportsDelete:false,supportsUpdate:false,pageSize:100};
export const permissionPageRightsListConfig: ListPageConfig & {dataSource:DataSourceConfig} = {
  pageId:'permission-page-rights',pageType:'worksheet',title:'Page Permissions',module:'Administration',autoSave:true,
  permissionPageId:'permission-sets',
  dataSource:source,identity:{primaryField:'code'},
  tools:{search:false,columns:false,export:false},
  standardActions:{new:false,delete:false},
  factBox:{enabled:false},
};
export const permissionPageRightsHeaderConfig: HeaderConfig = {
  dialogTitle:'Page Permissions',toolbarButtons:[],sections:[],
};
export const permissionPageRightsLineConfig: LineConfig = {
  placement:{mode:'end'},lineKeyField:'systemId',
  dataSource:source,toolbarButtons:[],
  columns:[{id:'pageId',label:'Page ID',valueType:'text',},
    {id:'canRead',label:'Read',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canCreate',label:'Insert',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canModify',label:'Modify',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canDelete',label:'Delete',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'canPost',label:'Post',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],}],
};
