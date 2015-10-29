__author__ = 'Taylor'

from django import forms

from .models import Terrain, Station, DataFile


class TerrainForm(forms.ModelForm):

    class Meta:
        model = Terrain
        fields = ('name','north_lat','south_lat','east_lng','west_lng','DEMx','DEMy')


class StationForm(forms.ModelForm):

    class Meta:
        model = Station
        fields = ('name','terrain','lat','long')


class DataFileForm(forms.ModelForm):

    file = forms.FileField(
        label='Select a file (.zip or .sdr only):'
    )

    class Meta:
        model = DataFile
        fields = ('station','terrain')