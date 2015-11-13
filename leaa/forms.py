__author__ = 'Taylor'

from django import forms
from django.forms import ModelForm
from .models import Terrain, Station, DataFile
from django.contrib.auth.models import User
from django.utils.translation import ugettext_lazy as _
from django.contrib.auth.forms import AuthenticationForm


class UserForm(ModelForm):

    class Meta:
        model = User
        fields = ('username', 'email', 'password')


class TerrainForm(ModelForm):

    class Meta:
        model = Terrain
        fields = ('name','north_lat','south_lat','east_lng','west_lng','DEMx','DEMy')
        help_texts = {
            'DEMx': _('Number of longitudinal segments in the DEM.'),
            'DEMy': _('Number of latitude segments. Enter -1 to maintain equal aspect ratio.'),
        }
        labels = {
            'name': _('Terrain Name'),
            'north_lat': _('North Latitude'),
            'south_lat': _('South Latitude'),
            'east_lng' : _('East Longitude'),
            'west_lng' : _('West Longitude'),
            'DEMx' : _('Number of Longitude Segments'),
            'DEMy' : _('Number of Latitude Segments'),
        }


class StationForm(ModelForm):

    class Meta:
        model = Station
        fields = ('name','terrain','lat','long')
        help_texts = {
            'terrain': _('Station must reside with selected terrain'),
            'lat': _('Latitude within selected terrain (must be within terrain boundaries)'),
            'long': _('Longitude within selected terrain'),
        }
        labels = {
            'name': _('Station Name'),
            'terrain': _('Select Terrain'),
            'lat' : _('Station Latitude'),
            'long': _('Station Longitude'),
        }


class DataFileForm(ModelForm):

    file = forms.FileField(
        label='Select Sodar Data',
        help_text='Must be a .sdr or a .zip of .sdr\'s'
    )

    class Meta:
        model = DataFile
        fields = ('station','terrain')
        labels = {
            'station': _('Station'),
            'terrain': _('Terrain'),
        }
        help_texts = {
            'station': _('Station data came from'),
            'terrain': _('Terrain where station resides'),
        }
