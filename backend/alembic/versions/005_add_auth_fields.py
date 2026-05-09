"""Add password_hash and email_verified to users

Revision ID: 005
Revises: 004
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('password_hash', sa.String(), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='true'))

def downgrade():
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'password_hash')
