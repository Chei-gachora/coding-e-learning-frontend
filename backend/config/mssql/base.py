from mssql.base import DatabaseWrapper as MssqlDatabaseWrapper

from .schema import DatabaseSchemaEditor


class DatabaseWrapper(MssqlDatabaseWrapper):
    SchemaEditorClass = DatabaseSchemaEditor