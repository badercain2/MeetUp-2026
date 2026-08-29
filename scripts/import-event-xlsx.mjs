import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import * as XLSX from 'xlsx'

const eventId = '6add2995-c0cf-4a50-a65a-0905945c18e4'
const workbookPath = process.argv.find((argument) => !argument.startsWith('-') && argument !== process.argv[0] && argument !== process.argv[1]) ?? 'Companias Meet UP.xlsx'
const replaceExisting = process.argv.includes('--replace')
const dietaryOnly = process.argv.includes('--update-dietary')

const workbook = XLSX.read(fs.readFileSync(workbookPath), { type: 'buffer', cellDates: true })
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })

const parseBirthDate = (value) => {
  const parsed = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return parsed
  const parts = parsed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!parts) throw new Error(`Fecha de cumpleaños inválida: ${parsed}`)
  const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3]
  return `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
}

const participants = rows.map((row, index) => {
  const companyNumber = Number.parseInt(String(row['Compañía']).trim(), 10)
  if (!row['Nombre de pila'] || !row['Apellido'] || !Number.isInteger(companyNumber) || companyNumber < 1 || companyNumber > 12) {
    throw new Error(`Fila ${index + 2} incompleta o con compañía inválida`)
  }
  const member = String(row['Es miembro'] ?? row['Miembro'] ?? '').trim().toLocaleLowerCase('es')
  return {
    first_name: String(row['Nombre de pila']).trim(),
    last_name: String(row['Apellido']).trim(),
    birth_date: parseBirthDate(row['Cumpleaños']),
    sex: String(row['Sexo']).trim().toLocaleLowerCase('es').startsWith('muj') ? 'MUJER' : 'HOMBRE',
    shirt_size: String(row['Talla de camiseta']).trim(),
    dietary_info: String(row['Información alimentaria']).trim() || null,
    age: Number.parseInt(String(row['Edad']).trim(), 10),
    stake: String(row['Nombre de la estaca o distrito']).trim(),
    ward: String(row['Nombre del barrio o rama']).trim(),
    company_number: companyNumber,
    is_church_member: !['no', 'visitante', 'false', '0'].includes(member)
  }
})

const json = JSON.stringify(participants).replaceAll("'", "''")
const source = `'${json}'::jsonb`
if (dietaryOnly) {
  const sql = `
begin;
with updated as (
  update public.participants participant
  set dietary_info = nullif(btrim(source.dietary_info), '')
  from jsonb_to_recordset(${source}) as source(first_name text, last_name text, birth_date date, sex text, shirt_size text, dietary_info text, age integer, stake text, ward text, company_number integer, is_church_member boolean)
  where participant.event_id = '${eventId}'
    and participant.first_name = source.first_name
    and participant.last_name = source.last_name
    and participant.birth_date is not distinct from source.birth_date
    and participant.age = source.age
    and participant.stake = source.stake
    and participant.ward = source.ward
  returning participant.id
)
select count(*) as updated from updated;
commit;
`
  execFileSync('supabase', ['db', 'query', '--linked', sql], { stdio: 'inherit' })
  console.log(`Actualizada la información alimentaria de ${participants.length} filas del Excel sin modificar check-ins ni compañías.`)
  process.exit(0)
}
const reset = replaceExisting ? `
delete from public.checkins where event_id = '${eventId}';
delete from public.material_deliveries where event_id = '${eventId}';
delete from public.company_memberships where event_id = '${eventId}';
delete from public.exceptions where event_id = '${eventId}';
delete from public.participants where event_id = '${eventId}';
` : ''

const sql = `
begin;
update public.events set company_count = 12, updated_at = now() where id = '${eventId}';
insert into public.companies(event_id, number, name, target_size, theme_color_token, theme_icon)
select '${eventId}', n, 'Compañía ' || n, 20,
  (array['lagoon','ember','cloud','gold','stone','path','lagoon','ember','cloud','gold','stone','path'])[n],
  (array['wave','fire','cloud','manna','mountain','path','star','fire','cloud','manna','mountain','path'])[n]
from generate_series(1, 12) as n
on conflict (event_id, number) do update
set name = excluded.name, target_size = excluded.target_size,
    theme_color_token = excluded.theme_color_token, theme_icon = excluded.theme_icon,
    active = true, updated_at = now();
${reset}
insert into public.participants(event_id, first_name, last_name, birth_date, sex, shirt_size, dietary_info, age, stake, ward, is_church_member, is_youth_leader, authorization_status, is_exception, checking)
select '${eventId}', source.first_name, source.last_name, source.birth_date, source.sex, source.shirt_size, source.dietary_info, source.age, source.stake, source.ward, source.is_church_member, false, 'pending', false, false
from jsonb_to_recordset(${source}) as source(first_name text, last_name text, birth_date date, sex text, shirt_size text, dietary_info text, age integer, stake text, ward text, company_number integer, is_church_member boolean);

insert into public.company_memberships(event_id, participant_id, company_id, assignment_source, is_current)
select '${eventId}', participant.id, company.id, 'PREASSIGNED', true
from jsonb_to_recordset(${source}) as source(first_name text, last_name text, birth_date date, sex text, shirt_size text, dietary_info text, age integer, stake text, ward text, company_number integer, is_church_member boolean)
join public.participants participant on participant.event_id = '${eventId}'
  and participant.first_name = source.first_name and participant.last_name = source.last_name
  and participant.birth_date is not distinct from source.birth_date and participant.age = source.age
  and participant.stake = source.stake and participant.ward = source.ward
join public.companies company on company.event_id = '${eventId}' and company.number = source.company_number;
insert into public.participants(event_id, first_name, last_name, birth_date, sex, shirt_size, dietary_info, age, stake, ward, is_church_member, is_youth_leader, authorization_status, is_exception, checking)
select '${eventId}', 'Usuario', 'de Prueba', '2012-01-01', 'HOMBRE', 'M', 'Sin restricciones', 14, 'Estaca de prueba', 'Barrio de prueba', true, false, 'confirmed', false, false
where not exists (select 1 from public.participants where event_id = '${eventId}' and first_name = 'Usuario' and last_name = 'de Prueba');
insert into public.company_memberships(event_id, participant_id, company_id, assignment_source, is_current)
select participant.event_id, participant.id, company.id, 'PREASSIGNED', true
from public.participants participant
join public.companies company on company.event_id = participant.event_id and company.number = 1
where participant.event_id = '${eventId}' and participant.first_name = 'Usuario' and participant.last_name = 'de Prueba'
  and not exists (select 1 from public.company_memberships membership where membership.participant_id = participant.id and membership.is_current);
commit;
`

execFileSync('supabase', ['db', 'query', '--linked', sql], { stdio: 'inherit' })
console.log(`Importados ${participants.length} participantes reales y 1 usuario de prueba en 12 compañías${replaceExisting ? ' (se reemplazaron los datos anteriores del evento)' : ''}.`)
