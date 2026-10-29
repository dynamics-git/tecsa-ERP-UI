import { DataSourceConfig, HeaderConfig, LineConfig, ListPageConfig } from '../../../platform/public-api';

const source: DataSourceConfig = {endpoint:'/users',keyField:'systemId',navigation:{parentEndpoint:'/users',parentIdFields:['systemId'],childCollection:'companies'},supportsCreate:true,supportsDelete:true,supportsUpdate:true,pageSize:100};
export const userCompaniesListConfig: ListPageConfig & {dataSource:DataSourceConfig} = {
  pageId:'user-companies',pageType:'worksheet',title:'Company Access',module:'Administration',autoSave:true,
  permissionPageId:'users',
  dataSource:source,identity:{primaryField:'userName'},
  tools:{search:false,columns:false,export:false},
  standardActions:{new:false,delete:false},
  factBox:{enabled:false},
};
export const userCompaniesHeaderConfig: HeaderConfig = {
  dialogTitle:'Company Access',toolbarButtons:[],sections:[],
};
export const userCompaniesLineConfig: LineConfig = {
  placement:{mode:'end'},lineKeyField:'systemId',
  dataSource:source,toolbarButtons:[],
  columns:[{id:'companyId',label:'Company',valueType:'guid',lookup:{endpoint:'/companies',valueField:'systemId',displayField:'code',searchFields:['code']},cellType:'dropdown',},
    {id:'isDefault',label:'Default',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],},
    {id:'isActive',label:'Active',valueType:'boolean',cellType:'select',options:[{label:'Yes',value:true},{label:'No',value:false}],}],
};
