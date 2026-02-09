import { validateRequest } from "@dokploy/server";
import { createServerSideHelpers } from "@trpc/react-query/server";
import type { GetServerSidePropsContext } from "next";
import type { ReactElement } from "react";
import superjson from "superjson";
import { ShowDestinations } from "@/components/dashboard/settings/destination/show-destinations";
import { ShowGoogleDriveDestinations } from "@/components/dashboard/settings/destination/show-google-drive-destinations";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appRouter } from "@/server/api/root";

const Page = () => {
	return (
		<div className="flex flex-col gap-4 w-full max-w-5xl mx-auto">
			<Tabs defaultValue="s3" className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="s3">S3 Destinations</TabsTrigger>
					<TabsTrigger value="google-drive">Google Drive</TabsTrigger>
				</TabsList>
				<TabsContent value="s3">
					<ShowDestinations />
				</TabsContent>
				<TabsContent value="google-drive">
					<ShowGoogleDriveDestinations />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default Page;

Page.getLayout = (page: ReactElement) => {
	return (
		<DashboardLayout metaName="Remote Storage">{page}</DashboardLayout>
	);
};
export async function getServerSideProps(
	ctx: GetServerSidePropsContext<{ serviceId: string }>,
) {
	const { req, res } = ctx;
	const { user, session } = await validateRequest(req);
	if (!user || user.role === "member") {
		return {
			redirect: {
				permanent: true,
				destination: "/",
			},
		};
	}

	const helpers = createServerSideHelpers({
		router: appRouter,
		ctx: {
			req: req as any,
			res: res as any,
			db: null as any,
			session: session as any,
			user: user as any,
		},
		transformer: superjson,
	});
	await helpers.user.get.prefetch();
	await helpers.settings.isCloud.prefetch();

	return {
		props: {
			trpcState: helpers.dehydrate(),
		},
	};
}
