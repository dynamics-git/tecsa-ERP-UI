import { DataSourceConfig, HeaderConfig, ListPageConfig, listColumns } from '../../../platform/public-api';
import { usersFactBoxConfig } from './users.factbox.config';

export const usersHeaderConfig: HeaderConfig = {
  dialogTitle: 'User',
  toolbarButtons: [
    {label:'Company Access',actionKey:'cmd:company-access',group:'Related',order:10,runModalPageId:'user-companies',runModalTarget:'entry'},
    {label:'Permission Sets',actionKey:'cmd:user-permission-sets',group:'Related',order:20,runModalPageId:'user-permission-sets',runModalTarget:'entry'},
    {label:'Sessions',actionKey:'cmd:user-sessions',group:'Related',order:30,runModalPageId:'user-sessions',runModalTarget:'entry'},
  ],
  sections:[{id:'general',title:'General',fields:[
    {key:'userName',label:'User ID',required:true,readonlyAfterCreate:true,validation:{maxLength:100}},
    {key:'name',label:'Name',required:true,validation:{maxLength:150}},
    {key:'email',label:'Email',type:'email',required:true,validation:{maxLength:255}},
    {key:'isActive',label:'Active',type:'boolean',defaultValue:true},
    {key:'lastLoginAt',label:'Last Login',type:'datetime',readonly:true},
  ]}],
};

export const usersListConfig: ListPageConfig & {dataSource:DataSourceConfig} = {
  pageId:'users',pageType:'card',title:'Users',module:'Administration',
  autoSave:true,
  menu:{module:'Administration',group:'Security',icon:'ts-icon ts-icon-users',moduleIcon:'ts-icon ts-icon-administration-module',route:'/users'},
  identity:{primaryField:'userName',secondaryField:'name'},
  dataSource:{endpoint:'/users',keyField:'systemId',defaultSort:'userName asc',pageSize:25,
    supportsCreate:false,supportsDelete:false},
  standardActions:{new:false,delete:false},
  dataSurface:{idField:'systemId',columns:listColumns(usersHeaderConfig,['userName','name','email','isActive','lastLoginAt'])},
  factBox:usersFactBoxConfig,
};
