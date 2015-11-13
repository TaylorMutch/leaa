from django.db import models
# from django.db.models.signals import post_save
from django.contrib.auth.models import User
# Create your models here.

# Contains info specific to the Terrain that needs to be generated
class Terrain(models.Model):
    name = models.CharField(max_length=100)
    MAPx = models.IntegerField()
    MAPy = models.IntegerField()
    DEMx = models.IntegerField()
    DEMy = models.IntegerField()
    maxHeight = models.IntegerField()
    #user = models.ManyToManyField(User)
    fileName = models.CharField(max_length=100)
    north_lat = models.FloatField()
    south_lat = models.FloatField()
    east_lng = models.FloatField()
    west_lng = models.FloatField()

    def __str__(self):
        return self.name

# Contains Latitude/Longitude to orient the station with a terrain
class Station(models.Model):
    name    = models.CharField(max_length=100)
    lat     = models.FloatField()
    long    = models.FloatField()
    demX    = models.IntegerField()
    demY    = models.IntegerField()
    terrain = models.ForeignKey('Terrain')

    def __str__(self):
        return self.name


def datafile_directory_path(instance, filename):
    return '{0}/{1}/{2}/{3}'.format(instance.terrain.name,instance.station.name,instance.creationDate[:4], filename)

# Mimic a .SDR file, we collect the initial and ending timestamp from the file (first/last)
class DataFile(models.Model):
    creationDate = models.DateField(auto_now_add=False)
    station = models.ForeignKey('Station')
    terrain = models.ForeignKey('Terrain')
    fileName = models.CharField(max_length=50)
    #filePath = models.FileField(upload_to=datafile_directory_path)

    def __str__(self):
        return str(self.creationDate)


class Setting(models.Model):
    vectorLength = models.FloatField(default=1)
    vectorHeight = models.FloatField(default=1)
    vectorColor = models.CharField(default='#ffff00', max_length=8)
    sceneHeight = models.FloatField(default=1)
    liveUpdate = models.BooleanField(default=False)
    user = models.ForeignKey(User)
    terrain = models.ForeignKey('Terrain')


class TerrainView(models.Model):
    name  = models.CharField(max_length=50)
    pos_x = models.FloatField()
    pos_y = models.FloatField()
    pos_z = models.FloatField()
    terrain = models.ForeignKey('Terrain')
    user = models.ForeignKey(User)
