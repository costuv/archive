from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Repository(models.Model):
    name = models.CharField(max_length=50)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    description = models.TextField(max_length=200, blank=True)
    created_at =models.DateTimeField(auto_now_add=True)
    is_assignment = models.BooleanField(default=False)
    is_lab = models.BooleanField(default=False)
    deadline = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.name
    
class Folder(models.Model):
    name = models.CharField(max_length=50)
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE)
    created_at =models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
class File(models.Model):
    name = models.CharField(max_length=50, blank=True)
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE)
    file = models.FileField(upload_to='uploads/')
    folder = models.ForeignKey(Folder, null=True, blank=True, on_delete=models.CASCADE)
    created_at =models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name.split('/')[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    