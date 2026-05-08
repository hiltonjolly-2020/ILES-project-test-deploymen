from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model
from ILES_app.models import Department, Company

User = get_user_model()

class Command(BaseCommand):
    help = 'Auto-setup departments, companies, and admin on fresh database'

    def handle(self, *args, **options):
        self.stdout.write('🔧 Running auto setup...')
        
        # Load departments only if empty
        if Department.objects.count() == 0:
            self.stdout.write('📚 Loading departments...')
            try:
                call_command('loaddata', 'departments.json', verbosity=0)
                self.stdout.write(self.style.SUCCESS(f'✅ Loaded {Department.objects.count()} departments'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error loading departments: {e}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️ Departments already exist ({Department.objects.count()} found), skipping...'))
        
        # Load companies only if empty
        if Company.objects.count() == 0:
            self.stdout.write('🏢 Loading companies...')
            try:
                call_command('loaddata', 'companies.json', verbosity=0)
                self.stdout.write(self.style.SUCCESS(f'✅ Loaded {Company.objects.count()} companies'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error loading companies: {e}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠️ Companies already exist ({Company.objects.count()} found), skipping...'))
        
        # Create superuser only if none exists
        if not User.objects.filter(is_superuser=True).exists():
            self.stdout.write('👑 Creating superuser...')
            User.objects.create_superuser(
                username='admin',
                email='admin@iles.com',
                password='admin123'
            )
            self.stdout.write(self.style.SUCCESS('✅ Superuser created: admin / admin123'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ Superuser already exists, skipping...'))
        
        self.stdout.write(self.style.SUCCESS('🎉 Auto setup complete!'))