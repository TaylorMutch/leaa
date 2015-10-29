from django.contrib import admin
from django.conf.urls import patterns
from django.http import HttpResponse

# Register your models here.

from .models import *

admin.site.register(Terrain)
admin.site.register(Station)
admin.site.register(DataFile)
admin.site.register(Setting)
