from django.db.backends.base.schema import _related_non_m2m_objects

from mssql.schema import DatabaseSchemaEditor as MssqlDatabaseSchemaEditor


class DatabaseSchemaEditor(MssqlDatabaseSchemaEditor):
    def _alter_field(
        self,
        model,
        old_field,
        new_field,
        old_type,
        new_type,
        old_db_params,
        new_db_params,
        strict=False,
    ):
        incoming_unique_indexes = []
        if (
            old_field.primary_key
            and new_field.primary_key
            and old_type != new_type
        ):
            for _old_rel, new_rel in _related_non_m2m_objects(old_field, new_field):
                if not new_rel.field.unique:
                    continue
                related_model = new_rel.related_model
                constraint_names = self._db_table_constraint_names(
                    related_model._meta.db_table,
                    [new_rel.field.column],
                    unique=True,
                    unique_constraint=True,
                )
                for constraint_name in constraint_names:
                    self.execute(
                        self._delete_constraint_sql(
                            self.sql_delete_constraint,
                            related_model,
                            constraint_name,
                        )
                    )
                    incoming_unique_indexes.append((related_model, new_rel.field))

                index_names = self._db_table_constraint_names(
                    related_model._meta.db_table,
                    [new_rel.field.column],
                    index=True,
                    unique=True,
                    unique_constraint=False,
                )
                for index_name in index_names:
                    self.execute(
                        self._db_table_delete_constraint_sql(
                            self.sql_delete_index,
                            related_model._meta.db_table,
                            index_name,
                        )
                    )
                    incoming_unique_indexes.append((related_model, new_rel.field))

        super()._alter_field(
            model,
            old_field,
            new_field,
            old_type,
            new_type,
            old_db_params,
            new_db_params,
            strict,
        )

        for related_model, related_field in incoming_unique_indexes:
            existing_unique_indexes = self._db_table_constraint_names(
                related_model._meta.db_table,
                [related_field.column],
                index=True,
                unique=True,
            )
            if not existing_unique_indexes:
                self.execute(self._create_unique_sql(related_model, [related_field]))