import { DataSourceConfig, HeaderConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
import { permissionSetsFactBoxConfig } from './permission-sets.factbox.config';

export const permissionSetsHeaderConfig: HeaderConfig = {
  dialogTitle:'Permission Set',
  toolbarButtons:[
    {label:'Page Permissions',actionKey:'cmd:page-rights',group:'Related',order:10,runModalPageId:'permission-page-rights',runModalTarget:'entry'},
    {label:'Resource Permissions',actionKey:'cmd:resource-rights',group:'Related',order:20,runModalPageId:'permission-resource-rights',runModalTarget:'entry'},
    {label:'Field and Action Permissions',actionKey:'cmd:target-rights',group:'Related',order:30,runModalPageId:'permission-target-rights',runModalTarget:'entry'},
  ],
  sections:[{id:'general',title:'General',fields:[
    {key:'code',label:'Code',valueType:'code',required:true,readonlyAfterCreate:true,validation:{maxLength:30}},
    {key:'name',label:'Name',required:true,validation:{maxLength:100}},
    {key:'description',label:'Description',type:'textarea',width:'wide',validation:{maxLength:255}},
    {key:'assignable',label:'Assignable',type:'boolean',defaultValue:true},
    {key:'isActive',label:'Active',type:'boolean',defaultValue:true},
    {key:'isSystem',label:'System',type:'boolean',readonly:true},
  ]}],
};

export const permissionSetsListConfig: ListPageConfig & {dataSource:DataSourceConfig} = {
  pageId:'permission-sets',pageType:'card',title:'Permission Sets',module:'Administration',autoSave:true,
  menu:{module:'Administration',group:'Security',icon:'ts-icon ts-icon-shield',moduleIcon:'ts-icon ts-icon-administration-module',route:'/permission-sets'},
  identity:{primaryField:'code',secondaryField:'name'},
  dataSource:{endpoint:'/permissionSets',keyField:'systemId',defaultSort:'code asc',pageSize:25,supportsDelete:false},
  standardActions:{delete:false},
  dataSurface:{idField:'systemId',columns:listColumns(permissionSetsHeaderConfig,['code','name','description','assignable','isActive','isSystem'])},
  factBox:permissionSetsFactBoxConfig,
};
