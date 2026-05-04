from django import forms


class AdminSignInForm(forms.Form):
    identifier = forms.CharField(max_length=150)
    password = forms.CharField(widget=forms.PasswordInput)


class AdminSignUpForm(forms.Form):
    username = forms.CharField(max_length=150)
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)


class ModerationForm(forms.Form):
    reason = forms.CharField(widget=forms.Textarea(attrs={"rows": 5}))
    action = forms.CharField()
    report_id = forms.CharField()
