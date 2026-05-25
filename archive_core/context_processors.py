from notices.models import Notice

def notices_unread(request):
    return {
        'notices_unread_count': Notice.objects.filter(is_read=False).count()
    }