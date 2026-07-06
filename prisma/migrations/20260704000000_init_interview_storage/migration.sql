create extension if not exists pgcrypto;

create table interview_share_pages (
  id uuid primary key default gen_random_uuid(),
  share_id text not null unique,
  title text not null default '면접 질문 정리',
  description text,
  audience_label text,
  updated_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  constraint interview_share_pages_share_id_format
    check (share_id ~ '^[A-Za-z0-9_-]{16,128}$')
);

create table interview_records (
  id uuid primary key default gen_random_uuid(),
  share_page_id uuid not null references interview_share_pages(id) on delete cascade,
  company text not null,
  position text,
  stage text,
  interview_date date not null,
  sort_order integer not null default 0,
  notes text[] not null default '{}',
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now()
);

create index interview_records_share_page_date_idx
  on interview_records (share_page_id, interview_date desc, sort_order asc);

create table interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_record_id uuid not null references interview_records(id) on delete cascade,
  question text not null,
  topic text,
  intent text,
  follow_ups text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now()
);

create index interview_questions_record_order_idx
  on interview_questions (interview_record_id, sort_order asc);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  object_path text not null,
  public_url text,
  alt_text text,
  caption text,
  mime_type text,
  byte_size bigint,
  width integer,
  height integer,
  usage_scope text not null default 'blog',
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  unique (bucket, object_path)
);

alter table interview_share_pages enable row level security;
alter table interview_records enable row level security;
alter table interview_questions enable row level security;
alter table media_assets enable row level security;
