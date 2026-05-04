from django.urls import path

from . import views

urlpatterns = [
    path("", views.dashboard, name="admin_dashboard"),
    path("sign-in/", views.sign_in, name="admin_sign_in"),
    path("sign-up/", views.sign_up, name="admin_sign_up"),
    path("logout/", views.logout_view, name="admin_logout"),
    path("reports/<str:report_id>/moderate/", views.moderate_fraud_report, name="admin_moderate_report"),
    path("listings/<str:listing_id>/suspend/", views.suspend_listing, name="admin_suspend_listing"),
    path("listings/<str:listing_id>/toggle-status/", views.toggle_listing_status, name="admin_toggle_listing_status"),
    path("listings/<str:listing_id>/delete/", views.delete_listing, name="admin_delete_listing"),
]
