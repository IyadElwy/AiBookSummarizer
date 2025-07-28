"""
create Summary table

Revision ID: 718177fa18d2
Revises: a15424c21dc2
Create Date: 2025-07-27 10:18:44.604204

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '718177fa18d2'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""CREATE TABLE summary(
                id SERIAL UNIQUE,
                ekz_user TEXT NOT NULL,
                isbn TEXT NOT NULL,
                status TEXT DEFAULT 'validating_isbn.' NOT NULL,
                creation_date TIMESTAMP DEFAULT NOW() NOT NULL
                )""")


def downgrade() -> None:
    op.execute('DROP TABLE summary')
